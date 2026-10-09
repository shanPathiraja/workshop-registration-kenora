import { IsEnum, IsOptional } from 'class-validator';
import { RegistrationStatus } from '../registration.entity.js';

export class RegistrationQueryDto {
  @IsOptional()
  @IsEnum(RegistrationStatus)
  status?: RegistrationStatus;
}
