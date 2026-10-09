import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { AuditService, diff } from '../audit/audit.service.js';
import type { CreateWorkshopDto } from './dto/create-workshop.dto.js';
import type { UpdateWorkshopDto } from './dto/update-workshop.dto.js';
import type { WorkshopQueryDto } from './dto/workshop-query.dto.js';
import { Workshop, WorkshopStatus } from './workshop.entity.js';

const PG_UNIQUE_VIOLATION = '23505';

const AUDITED_FIELDS = [
  'code',
  'title',
  'description',
  'instructor',
  'location',
  'startsAt',
  'endsAt',
  'capacity',
  'status',
] as const;

@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(Workshop)
    private readonly workshopsRepository: Repository<Workshop>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    query: WorkshopQueryDto,
  ): Promise<{ items: Workshop[]; total: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const qb = this.workshopsRepository
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.createdBy', 'createdBy')
      .leftJoinAndSelect('w.updatedBy', 'updatedBy')
      .orderBy('w.startsAt', 'ASC')
      .addOrderBy('w.code', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (query.search) {
      qb.andWhere(
        '(w.code ILIKE :search OR w.title ILIKE :search OR w.instructor ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.status)
      qb.andWhere('w.status = :status', { status: query.status });
    if (query.location) {
      qb.andWhere('w.location = :location', { location: query.location });
    }
    if (query.from) qb.andWhere('w.startsAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('w.startsAt <= :to', { to: query.to });
    if (query.hasSeats === true) qb.andWhere('w.activeCount < w.capacity');
    if (query.hasSeats === false) qb.andWhere('w.activeCount >= w.capacity');

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findOne(id: string): Promise<Workshop> {
    const workshop = await this.workshopsRepository.findOne({
      where: { id },
      relations: { createdBy: true, updatedBy: true },
    });
    if (!workshop) throw new NotFoundException('Workshop not found');
    return workshop;
  }

  async create(dto: CreateWorkshopDto, authUserId: string): Promise<Workshop> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.assertTimes(startsAt, endsAt);

    const id = await this.workshopsRepository.manager.transaction(
      async (manager) => {
        const repo = manager.getRepository(Workshop);
        const workshop = repo.create({
          ...dto,
          description: dto.description?.trim() || null,
          startsAt,
          endsAt,
          activeCount: 0,
          status: WorkshopStatus.SCHEDULED,
          createdBy: { id: authUserId },
          updatedBy: { id: authUserId },
        });
        const saved = await this.saveUnique(manager, workshop);
        await this.auditService.record(
          {
            actorId: authUserId,
            action: 'WORKSHOP_CREATED',
            entityType: 'WORKSHOP',
            entityId: saved.id,
            changes: diff({}, saved, AUDITED_FIELDS),
          },
          manager,
        );
        return saved.id;
      },
    );
    return this.findOne(id);
  }

  async update(
    id: string,
    dto: UpdateWorkshopDto,
    authUserId: string,
  ): Promise<Workshop> {
    await this.workshopsRepository.manager.transaction(async (manager) => {
      // Lock the row: registrations take the same lock, so a capacity change
      // can never interleave with someone taking a seat.
      const workshop = await this.lockWorkshop(manager, id);
      const before = { ...workshop };

      // Only copy fields that were sent (unsent DTO fields are undefined).
      if (dto.code !== undefined) workshop.code = dto.code;
      if (dto.title !== undefined) workshop.title = dto.title;
      if (dto.description !== undefined) {
        workshop.description = dto.description?.trim() || null;
      }
      if (dto.instructor !== undefined) workshop.instructor = dto.instructor;
      if (dto.location !== undefined) workshop.location = dto.location;
      if (dto.startsAt !== undefined)
        workshop.startsAt = new Date(dto.startsAt);
      if (dto.endsAt !== undefined) workshop.endsAt = new Date(dto.endsAt);
      if (dto.status !== undefined) workshop.status = dto.status;
      if (dto.capacity !== undefined) {
        if (dto.capacity < workshop.activeCount) {
          throw new BadRequestException(
            `Capacity cannot be lower than the ${workshop.activeCount} people already registered`,
          );
        }
        workshop.capacity = dto.capacity;
      }
      this.assertTimes(workshop.startsAt, workshop.endsAt);

      const changes = diff(before, workshop, AUDITED_FIELDS);
      if (Object.keys(changes).length === 0) return;

      workshop.updatedBy = { id: authUserId } as Workshop['updatedBy'];
      await this.saveUnique(manager, workshop);
      await this.auditService.record(
        {
          actorId: authUserId,
          action:
            changes.status && workshop.status === WorkshopStatus.CANCELLED
              ? 'WORKSHOP_CANCELLED'
              : 'WORKSHOP_UPDATED',
          entityType: 'WORKSHOP',
          entityId: id,
          changes,
        },
        manager,
      );
    });
    return this.findOne(id);
  }

  cancel(id: string, authUserId: string): Promise<Workshop> {
    return this.update(id, { status: WorkshopStatus.CANCELLED }, authUserId);
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

  private assertTimes(startsAt: Date, endsAt: Date): void {
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException('End time must be after the start time');
    }
  }

  private async saveUnique(
    manager: EntityManager,
    workshop: Workshop,
  ): Promise<Workshop> {
    try {
      return await manager.getRepository(Workshop).save(workshop);
    } catch (error) {
      const code = (error as QueryFailedError & { code?: string }).code;
      if (error instanceof QueryFailedError && code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException('A workshop with this code already exists');
      }
      throw error;
    }
  }
}
