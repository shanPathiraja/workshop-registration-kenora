import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ROLES } from '../users/user.entity.js';
import { AuthService } from './auth.service.js';
import { CurrentUser, Public, Roles, type AuthUser } from './decorators.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Roles(...ROLES)
  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
