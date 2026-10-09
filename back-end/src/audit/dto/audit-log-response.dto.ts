import { UserResponseDto } from '../../users/dto/user-response.dto.js';
import type {
  AuditChanges,
  AuditEntityType,
  AuditLog,
} from '../audit-log.entity.js';

export class AuditLogResponseDto {
  id: string;
  actor: UserResponseDto | null;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  changes: AuditChanges | null;
  createdAt: Date;

  static fromEntity(log: AuditLog): AuditLogResponseDto {
    const dto = new AuditLogResponseDto();
    dto.id = log.id;
    dto.actor = log.actor ? UserResponseDto.fromEntity(log.actor) : null;
    dto.action = log.action;
    dto.entityType = log.entityType;
    dto.entityId = log.entityId;
    dto.changes = log.changes;
    dto.createdAt = log.createdAt;
    return dto;
  }
}
