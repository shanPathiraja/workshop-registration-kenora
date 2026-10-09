import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { Workshop, WorkshopStatus } from '../workshops/workshop.entity.js';
import type { CancelRegistrationDto } from './dto/cancel-registration.dto.js';
import type { CreateRegistrationDto } from './dto/create-registration.dto.js';
import type { RegistrationQueryDto } from './dto/registration-query.dto.js';
import { Registration, RegistrationStatus } from './registration.entity.js';

const PG_UNIQUE_VIOLATION = '23505';

/**
 * How over-registration is prevented:
 *
 * 1. Every seat change runs in a transaction that first takes a row lock on
 *    the workshop (SELECT ... FOR UPDATE). Concurrent requests for the same
 *    workshop queue up behind each other; other workshops are unaffected.
 * 2. Inside the lock the seat count is re-read, so the "is it full?" check
 *    and the increment can never interleave with another request.
 * 3. The database CHECK (active_count <= capacity) rejects any commit that
 *    would overbook, as a last line of defence.
 */
@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(Registration)
    private readonly registrationsRepository: Repository<Registration>,
    private readonly auditService: AuditService,
  ) {}

  async findForWorkshop(
    workshopId: string,
    query: RegistrationQueryDto,
  ): Promise<{ items: Registration[]; total: number }> {
    const exists = await this.registrationsRepository.manager
      .getRepository(Workshop)
      .existsBy({ id: workshopId });
    if (!exists) throw new NotFoundException('Workshop not found');

    const [items, total] = await this.registrationsRepository.findAndCount({
      where: { workshopId, ...(query.status && { status: query.status }) },
      relations: { registeredBy: true, cancelledBy: true },
      order: { registeredAt: 'DESC' },
    });
    return { items, total };
  }

  async register(
    workshopId: string,
    dto: CreateRegistrationDto,
    authUserId: string,
  ): Promise<Registration> {
    const id = await this.registrationsRepository.manager.transaction(
      async (manager) => {
        const workshop = await this.lockWorkshop(manager, workshopId);

        if (workshop.status !== WorkshopStatus.SCHEDULED) {
          throw new BadRequestException(
            `This workshop is ${workshop.status.toLowerCase()} and is not taking registrations`,
          );
        }
        if (workshop.startsAt.getTime() <= Date.now()) {
          throw new BadRequestException('This workshop has already started');
        }
        if (workshop.activeCount >= workshop.capacity) {
          throw new ConflictException(
            'Sorry, this workshop is full. The last seat was just taken.',
          );
        }

        const repo = manager.getRepository(Registration);
        const duplicate = await repo.existsBy({
          workshopId,
          attendeeEmail: dto.attendeeEmail,
          status: RegistrationStatus.ACTIVE,
        });
        if (duplicate) {
          throw new ConflictException(
            'This email is already registered for this workshop',
          );
        }

        let saved: Registration;
        try {
          saved = await repo.save(
            repo.create({
              workshopId,
              attendeeName: dto.attendeeName,
              attendeeEmail: dto.attendeeEmail,
              status: RegistrationStatus.ACTIVE,
              registeredBy: { id: authUserId },
            }),
          );
        } catch (error) {
          const code = (error as QueryFailedError & { code?: string }).code;
          if (
            error instanceof QueryFailedError &&
            code === PG_UNIQUE_VIOLATION
          ) {
            throw new ConflictException(
              'This email is already registered for this workshop',
            );
          }
          throw error;
        }
        await manager.increment(Workshop, { id: workshopId }, 'activeCount', 1);

        await this.auditService.record(
          {
            actorId: authUserId,
            action: 'REGISTRATION_CREATED',
            entityType: 'REGISTRATION',
            entityId: saved.id,
            changes: {
              workshop: { from: null, to: workshop.code },
              attendeeName: { from: null, to: dto.attendeeName },
              attendeeEmail: { from: null, to: dto.attendeeEmail },
            },
          },
          manager,
        );
        return saved.id;
      },
    );
    return this.findOne(id);
  }

  async cancel(
    id: string,
    dto: CancelRegistrationDto,
    authUserId: string,
  ): Promise<Registration> {
    const existing = await this.registrationsRepository.findOneBy({ id });
    if (!existing) throw new NotFoundException('Registration not found');

    await this.registrationsRepository.manager.transaction(async (manager) => {
      // Same lock order as register(): workshop first, then the registration.
      const workshop = await this.lockWorkshop(manager, existing.workshopId);
      const repo = manager.getRepository(Registration);
      const registration = await repo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!registration) throw new NotFoundException('Registration not found');
      if (registration.status === RegistrationStatus.CANCELLED) {
        throw new ConflictException('This registration is already cancelled');
      }

      // Never deleted: the row stays as history, only its status changes.
      registration.status = RegistrationStatus.CANCELLED;
      registration.cancelledBy = {
        id: authUserId,
      } as Registration['cancelledBy'];
      registration.cancelledAt = new Date();
      registration.cancelReason = dto.reason || null;
      await repo.save(registration);
      await manager.decrement(Workshop, { id: workshop.id }, 'activeCount', 1);

      await this.auditService.record(
        {
          actorId: authUserId,
          action: 'REGISTRATION_CANCELLED',
          entityType: 'REGISTRATION',
          entityId: id,
          changes: {
            workshop: { from: null, to: workshop.code },
            attendeeName: { from: null, to: registration.attendeeName },
            status: {
              from: RegistrationStatus.ACTIVE,
              to: RegistrationStatus.CANCELLED,
            },
            ...(registration.cancelReason && {
              cancelReason: { from: null, to: registration.cancelReason },
            }),
          },
        },
        manager,
      );
    });
    return this.findOne(id);
  }

  private async findOne(id: string): Promise<Registration> {
    const registration = await this.registrationsRepository.findOne({
      where: { id },
      relations: { registeredBy: true, cancelledBy: true },
    });
    if (!registration) throw new NotFoundException('Registration not found');
    return registration;
  }

  private async lockWorkshop(
    manager: EntityManager,
    id: string,
  ): Promise<Workshop> {
    const workshop = await manager.getRepository(Workshop).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!workshop) throw new NotFoundException('Workshop not found');
    return workshop;
  }
}
