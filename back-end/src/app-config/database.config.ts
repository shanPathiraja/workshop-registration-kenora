import type { DataSourceOptions } from 'typeorm';
import { AuditLog } from '../audit/audit-log.entity.js';
import { Registration } from '../registrations/registration.entity.js';
import { User } from '../users/user.entity.js';
import { Workshop } from '../workshops/workshop.entity.js';

export const entities = [User, Workshop, Registration, AuditLog];

export const buildDataSourceOptions = (
  env: NodeJS.ProcessEnv,
): DataSourceOptions => ({
  type: 'postgres',
  host: env.DB_HOST ?? 'localhost',
  port: parseInt(env.DB_PORT ?? '5432', 10),
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  entities,
  synchronize: false,
});
