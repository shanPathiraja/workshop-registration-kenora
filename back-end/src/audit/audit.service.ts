import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import type { Role } from '../users/user.entity.js';
import {
  AuditLog,
  type AuditChanges,
  type AuditEntityType,
} from './audit-log.entity.js';
import type { AuditQueryDto } from './dto/audit-query.dto.js';

/**
 * Which part of the history each role may read. Mirrors the permission
 * matrix: admins manage accounts only; managers own workshops and
 * registrations. Staff have no access to the audit log.
 */
const VISIBLE_TYPES: Record<Role, readonly AuditEntityType[]> = {
  admin: ['USER'],
  manager: ['WORKSHOP', 'REGISTRATION'],
  staff: [],
};

export interface AuditEntry {
  actorId: string | null;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  changes?: AuditChanges | null;
}

/** Field-level diff of `before` → `after` for the given keys. */
export function diff<T extends object>(
  before: Partial<T>,
  after: Partial<T>,
  keys: readonly (keyof T)[],
): AuditChanges {
  const changes: AuditChanges = {};
  for (const key of keys) {
    const from = before[key];
    const to = after[key];
    const same =
      from instanceof Date && to instanceof Date
        ? from.getTime() === to.getTime()
        : from === to;
    if (!same) changes[String(key)] = { from: from ?? null, to: to ?? null };
  }
  return changes;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * Records an entry. Pass the transaction's EntityManager so the log entry
   * commits (or rolls back) together with the change it describes.
   */
  async record(entry: AuditEntry, manager?: EntityManager): Promise<void> {
    const repo = manager
      ? manager.getRepository(AuditLog)
      : this.auditRepository;
    await repo.save(
      repo.create({
        actor: entry.actorId ? { id: entry.actorId } : null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        changes: entry.changes ?? null,
      }),
    );
  }

  async findAll(
    query: AuditQueryDto,
    role: Role,
  ): Promise<{ items: AuditLog[]; total: number }> {
    const visible = VISIBLE_TYPES[role];
    if (query.entityType && !visible.includes(query.entityType)) {
      throw new ForbiddenException('You do not have permission to do this');
    }
    const types = query.entityType ? [query.entityType] : visible;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const qb = this.auditRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .where('log.entityType IN (:...types)', { types })
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (query.entityId) {
      qb.andWhere('log.entityId = :entityId', { entityId: query.entityId });
    }
    if (query.actorId) {
      qb.andWhere('actor.id = :actorId', { actorId: query.actorId });
    }
    if (query.from) qb.andWhere('log.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('log.createdAt <= :to', { to: query.to });

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }
}
