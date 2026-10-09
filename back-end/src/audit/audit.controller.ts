import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser, Roles, type AuthUser } from '../auth/decorators.js';
import { AuditService } from './audit.service.js';
import { AuditLogResponseDto } from './dto/audit-log-response.dto.js';
import { AuditQueryDto } from './dto/audit-query.dto.js';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /** Admins see account changes; managers see workshop and registration changes. */
  @Roles('admin', 'manager')
  @Get()
  async findAll(
    @Query() query: AuditQueryDto,
    @CurrentUser() authUser: AuthUser,
  ): Promise<{ items: AuditLogResponseDto[]; total: number }> {
    const { items, total } = await this.auditService.findAll(
      query,
      authUser.role,
    );
    return {
      items: items.map((log) => AuditLogResponseDto.fromEntity(log)),
      total,
    };
  }
}
