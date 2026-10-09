import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, Roles, type AuthUser } from '../auth/decorators.js';
import { CancelRegistrationDto } from './dto/cancel-registration.dto.js';
import { CreateRegistrationDto } from './dto/create-registration.dto.js';
import { RegistrationQueryDto } from './dto/registration-query.dto.js';
import { RegistrationResponseDto } from './dto/registration-response.dto.js';
import { RegistrationsService } from './registrations.service.js';

/** Front-desk work: managers and staff register, cancel and view history. */
@Roles('manager', 'staff')
@Controller()
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get('workshops/:workshopId/registrations')
  async findForWorkshop(
    @Param('workshopId', ParseUUIDPipe) workshopId: string,
    @Query() query: RegistrationQueryDto,
  ): Promise<{ items: RegistrationResponseDto[]; total: number }> {
    const { items, total } = await this.registrationsService.findForWorkshop(
      workshopId,
      query,
    );
    return {
      items: items.map((r) => RegistrationResponseDto.fromEntity(r)),
      total,
    };
  }

  @Post('workshops/:workshopId/registrations')
  async register(
    @Param('workshopId', ParseUUIDPipe) workshopId: string,
    @Body() dto: CreateRegistrationDto,
    @CurrentUser() authUser: AuthUser,
  ): Promise<RegistrationResponseDto> {
    return RegistrationResponseDto.fromEntity(
      await this.registrationsService.register(workshopId, dto, authUser.id),
    );
  }

  @Post('registrations/:id/cancel')
  @HttpCode(200)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRegistrationDto,
    @CurrentUser() authUser: AuthUser,
  ): Promise<RegistrationResponseDto> {
    return RegistrationResponseDto.fromEntity(
      await this.registrationsService.cancel(id, dto, authUser.id),
    );
  }
}
