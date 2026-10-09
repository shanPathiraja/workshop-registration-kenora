import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import type { Role } from '../users/user.entity.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/** Skips authentication entirely (only the login endpoint). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Roles allowed to call a route. Every non-public route MUST declare this;
 * the global AuthGuard refuses routes without it (deny by default).
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
