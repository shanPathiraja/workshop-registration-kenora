import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity.js';

export const AUDIT_ENTITY_TYPES = ['USER', 'WORKSHOP', 'REGISTRATION'] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];
export type AuditChanges = Record<string, { from: unknown; to: unknown }>;

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column()
  action: string;

  @Column({ name: 'entity_type', type: 'varchar' })
  entityType: AuditEntityType;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ type: 'jsonb', nullable: true })
  changes: AuditChanges | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
