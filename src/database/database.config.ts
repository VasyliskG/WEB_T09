import { config } from 'dotenv';

config({ quiet: true });

/**
 * Спільні параметри підключення для застосунку (TypeOrmModule.forRoot)
 * та для TypeORM CLI (data-source.ts). synchronize вимкнено — схема БД
 * змінюється лише через міграції.
 */
export const connectionOptions = {
  type: 'postgres' as const,
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5434),
  username: process.env.DB_USER ?? 'nest_user',
  password: process.env.DB_PASSWORD ?? 'nest_password',
  database: process.env.DB_NAME ?? 'store_db',
  synchronize: false,
};
