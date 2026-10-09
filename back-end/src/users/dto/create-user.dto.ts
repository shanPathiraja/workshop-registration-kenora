import type { Role } from '../user.entity.js';

export class CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: Role;
}
