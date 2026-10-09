import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { User, type Role } from '../users/user.entity.js';
import { IS_PUBLIC_KEY, ROLES_KEY, type AuthUser } from './decorators.js';

/**
 * Global guard: authenticates the bearer token, then authorises by role.
 *
 * The user is re-read from the database on every request so that a
 * deactivated account or a role change takes effect immediately rather than
 * when the token expires.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Please sign in');
    }

    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(token);
    } catch {
      throw new UnauthorizedException('Your session has expired');
    }

    const user = await this.users.findOneBy({ id: payload.sub });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('This account is no longer active');
    }
    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const allowed = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      targets,
    );
    if (!allowed?.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to do this');
    }
    return true;
  }
}
