import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity.js';
import { Workshop } from '../workshops/workshop.entity.js';

export enum RegistrationStatus {
  ACTIVE = 'ACTIVE',
  WAITLISTED = 'WAITLISTED',
  CANCELLED = 'CANCELLED',
}

/** Rows are never deleted: cancelling only changes the status. */
@Entity('registrations')
export class Registration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workshop, { nullable: false })
  @JoinColumn({ name: 'workshop_id' })
  workshop: Workshop;

  @Column({ name: 'workshop_id' })
  workshopId: string;

  @Column({ name: 'attendee_name' })
  attendeeName: string;

  @Column({ name: 'attendee_email' })
  attendeeEmail: string;

  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    enumName: 'registration_status',
  })
  status: RegistrationStatus;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'registered_by' })
  registeredBy: User;

  @CreateDateColumn({ name: 'registered_at', type: 'timestamptz' })
  registeredAt: Date;

  /** Set when a waitlisted registration was given a freed seat. */
  @Column({ name: 'promoted_at', type: 'timestamptz', nullable: true })
  promotedAt: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'cancelled_by' })
  cancelledBy: User | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;
}
