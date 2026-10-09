import { UserResponseDto } from '../../users/dto/user-response.dto.js';
import type { Workshop, WorkshopStatus } from '../workshop.entity.js';

export class WorkshopResponseDto {
  id: string;
  code: string;
  title: string;
  description: string | null;
  instructor: string;
  location: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  activeCount: number;
  seatsLeft: number;
  status: WorkshopStatus;
  createdBy: UserResponseDto | null;
  updatedBy: UserResponseDto | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(workshop: Workshop): WorkshopResponseDto {
    const dto = new WorkshopResponseDto();
    dto.id = workshop.id;
    dto.code = workshop.code;
    dto.title = workshop.title;
    dto.description = workshop.description;
    dto.instructor = workshop.instructor;
    dto.location = workshop.location;
    dto.startsAt = workshop.startsAt;
    dto.endsAt = workshop.endsAt;
    dto.capacity = workshop.capacity;
    dto.activeCount = workshop.activeCount;
    dto.seatsLeft = Math.max(0, workshop.capacity - workshop.activeCount);
    dto.status = workshop.status;
    dto.createdBy = workshop.createdBy
      ? UserResponseDto.fromEntity(workshop.createdBy)
      : null;
    dto.updatedBy = workshop.updatedBy
      ? UserResponseDto.fromEntity(workshop.updatedBy)
      : null;
    dto.createdAt = workshop.createdAt;
    dto.updatedAt = workshop.updatedAt;
    return dto;
  }
}
