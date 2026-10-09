import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity.js';

export enum WorkshopStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Entity('workshops')
@Check(
  'workshops_seats_within_capacity',
  '"active_count" >= 0 AND "active_count" <= "capacity"',
)
@Check('workshops_capacity_positive', '"capacity" > 0')
@Check('workshops_ends_after_start', '"ends_at" > "starts_at"')
export class Workshop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('workshops_code_uq', { unique: true })
  @Column()
  code: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column()
  instructor: string;

  @Column()
  location: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ name: 'active_count', type: 'int', default: 0 })
  activeCount: number;

  @Column({
    type: 'enum',
    enum: WorkshopStatus,
    enumName: 'workshop_status',
    default: WorkshopStatus.SCHEDULED,
  })
  status: WorkshopStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
