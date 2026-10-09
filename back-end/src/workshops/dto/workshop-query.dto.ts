import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { toBoolean } from '../../common/transforms.js';
import { WorkshopStatus } from '../workshop.entity.js';

export class WorkshopQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(WorkshopStatus)
  status?: WorkshopStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  /** Workshops starting on or after this instant. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Workshops starting on or before this instant. */
  @IsOptional()
  @IsDateString()
  to?: string;

  /** Only workshops with at least one free seat. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasSeats?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
