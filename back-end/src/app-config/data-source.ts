import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './database.config.js';

process.loadEnvFile?.();

export default new DataSource(buildDataSourceOptions(process.env));
