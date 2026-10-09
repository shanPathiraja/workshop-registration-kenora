import type { DataSourceOptions } from 'typeorm';

export const buildDataSourceOptions = (
  env: NodeJS.ProcessEnv,
): DataSourceOptions => ({
  type: 'postgres',
  host: env.DB_HOST ?? 'localhost',
  port: parseInt(env.DB_PORT ?? '5432', 10),
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  entities: [`${import.meta.dirname}/../**/*.entity.{ts,js}`],
  migrations: [`${import.meta.dirname}/../database/migrations/*.{ts,js}`],
  synchronize: false,
});
