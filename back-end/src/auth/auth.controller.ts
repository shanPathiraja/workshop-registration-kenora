import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ROLES } from '../users/user.entity.js';
import { AuthService } from './auth.service.js';
import { CurrentUser, Public, Roles, type AuthUser } from './decorators.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    const { accessToken, user } = await this.auth.login(
      dto.email,
      dto.password,
    );
    return LoginResponseDto.from(accessToken, user);
  }

  @Roles(...ROLES)
  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    return UserResponseDto.fromEntity(await this.auth.me(user.id));
  }
}
