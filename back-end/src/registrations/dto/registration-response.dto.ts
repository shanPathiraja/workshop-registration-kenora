import { UserResponseDto } from '../../users/dto/user-response.dto.js';
import type {
  Registration,
  RegistrationStatus,
} from '../registration.entity.js';

export class RegistrationResponseDto {
  id: string;
  workshopId: string;
  attendeeName: string;
  attendeeEmail: string;
  status: RegistrationStatus;
  registeredBy: UserResponseDto | null;
  registeredAt: Date;
  promotedAt: Date | null;
  cancelledBy: UserResponseDto | null;
  cancelledAt: Date | null;
  cancelReason: string | null;

  static fromEntity(r: Registration): RegistrationResponseDto {
    const dto = new RegistrationResponseDto();
    dto.id = r.id;
    dto.workshopId = r.workshopId;
    dto.attendeeName = r.attendeeName;
    dto.attendeeEmail = r.attendeeEmail;
    dto.status = r.status;
    dto.registeredBy = r.registeredBy
      ? UserResponseDto.fromEntity(r.registeredBy)
      : null;
    dto.registeredAt = r.registeredAt;
    dto.promotedAt = r.promotedAt;
    dto.cancelledBy = r.cancelledBy
      ? UserResponseDto.fromEntity(r.cancelledBy)
      : null;
    dto.cancelledAt = r.cancelledAt;
    dto.cancelReason = r.cancelReason;
    return dto;
  }
}
