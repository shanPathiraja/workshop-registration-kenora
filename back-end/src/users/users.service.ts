import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { AuditService, diff } from '../audit/audit.service.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './user.entity.js';

const PG_UNIQUE_VIOLATION = '23505';

const AUDITED_FIELDS = ['name', 'email', 'role', 'isActive'] as const;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    { password, ...dto }: CreateUserDto,
    authUserId: string,
  ): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 12);
    return this.usersRepository.manager.transaction(async (manager) => {
      const user = await this.saveUnique(
        manager,
        manager.getRepository(User).create({
          ...dto,
          email: dto.email.toLowerCase(),
          passwordHash,
        }),
      );
      await this.auditService.record(
        {
          actorId: authUserId,
          action: 'USER_CREATED',
          entityType: 'USER',
          entityId: user.id,
          changes: diff({}, user, AUDITED_FIELDS),
        },
        manager,
      );
      return user;
    });
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'ASC' } });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(
    id: string,
    { password, ...dto }: UpdateUserDto,
    authUserId: string,
  ): Promise<User> {
    const user = await this.findOne(id);
    if (id === authUserId) {
      if (dto.role !== undefined && dto.role !== user.role) {
        throw new BadRequestException('You cannot change your own role');
      }
      if (dto.isActive === false) {
        throw new BadRequestException('You cannot deactivate your own account');
      }
    }
    const before = { ...user };
    // Only copy fields that were sent: the validated DTO instance carries
    // every declared property, with unsent ones set to undefined.
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined) user.email = dto.email.toLowerCase();
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (password) user.passwordHash = await bcrypt.hash(password, 12);

    const changes = diff(before, user, AUDITED_FIELDS);
    // Record that the password changed, never its value.
    if (password) changes.password = { from: null, to: '(changed)' };

    return this.usersRepository.manager.transaction(async (manager) => {
      const saved = await this.saveUnique(manager, user);
      if (Object.keys(changes).length > 0) {
        await this.auditService.record(
          {
            actorId: authUserId,
            action: this.updateAction(changes),
            entityType: 'USER',
            entityId: id,
            changes,
          },
          manager,
        );
      }
      return saved;
    });
  }

  async deactivate(id: string, authUserId: string): Promise<void> {
    if (id === authUserId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    const user = await this.findOne(id);
    if (!user.isActive) return;
    user.isActive = false;
    await this.usersRepository.manager.transaction(async (manager) => {
      await manager.getRepository(User).save(user);
      await this.auditService.record(
        {
          actorId: authUserId,
          action: 'USER_DEACTIVATED',
          entityType: 'USER',
          entityId: id,
          changes: { isActive: { from: true, to: false } },
        },
        manager,
      );
    });
  }

  private updateAction(changes: Record<string, unknown>): string {
    const keys = Object.keys(changes);
    if (keys.length === 1 && keys[0] === 'role') return 'USER_ROLE_CHANGED';
    if (keys.length === 1 && keys[0] === 'isActive') {
      return (changes.isActive as { to: boolean }).to
        ? 'USER_REACTIVATED'
        : 'USER_DEACTIVATED';
    }
    if (keys.length === 1 && keys[0] === 'password')
      return 'USER_PASSWORD_RESET';
    return 'USER_UPDATED';
  }

  private async saveUnique(manager: EntityManager, user: User): Promise<User> {
    try {
      return await manager.getRepository(User).save(user);
    } catch (error) {
      const code = (error as QueryFailedError & { code?: string }).code;
      if (error instanceof QueryFailedError && code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException('A user with this email already exists');
      }
      throw error;
    }
  }
}
