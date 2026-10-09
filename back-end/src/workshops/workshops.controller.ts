import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, Roles, type AuthUser } from '../auth/decorators.js';
import { CreateWorkshopDto } from './dto/create-workshop.dto.js';
import { UpdateWorkshopDto } from './dto/update-workshop.dto.js';
import { WorkshopQueryDto } from './dto/workshop-query.dto.js';
import { WorkshopResponseDto } from './dto/workshop-response.dto.js';
import { WorkshopsService } from './workshops.service.js';

@Controller('workshops')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Roles('manager', 'staff')
  @Get()
  async findAll(
    @Query() query: WorkshopQueryDto,
  ): Promise<{ items: WorkshopResponseDto[]; total: number }> {
    const { items, total } = await this.workshopsService.findAll(query);
    return {
      items: items.map((w) => WorkshopResponseDto.fromEntity(w)),
      total,
    };
  }

  @Roles('manager', 'staff')
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkshopResponseDto> {
    return WorkshopResponseDto.fromEntity(
      await this.workshopsService.findOne(id),
    );
  }

  @Roles('manager')
  @Post()
  async create(
    @Body() dto: CreateWorkshopDto,
    @CurrentUser() authUser: AuthUser,
  ): Promise<WorkshopResponseDto> {
    return WorkshopResponseDto.fromEntity(
      await this.workshopsService.create(dto, authUser.id),
    );
  }

  @Roles('manager')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkshopDto,
    @CurrentUser() authUser: AuthUser,
  ): Promise<WorkshopResponseDto> {
    return WorkshopResponseDto.fromEntity(
      await this.workshopsService.update(id, dto, authUser.id),
    );
  }

  @Roles('manager')
  @Post(':id/cancel')
  @HttpCode(200)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() authUser: AuthUser,
  ): Promise<WorkshopResponseDto> {
    return WorkshopResponseDto.fromEntity(
      await this.workshopsService.cancel(id, authUser.id),
    );
  }
}
