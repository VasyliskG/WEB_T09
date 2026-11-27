import { DataSource } from 'typeorm';
import { connectionOptions } from './database.config';

// Під час запуску CLI через ts-node файл виконується з src/ (*.ts),
// після `nest build` — з dist/ (*.js). Розширення обираємо відповідно,
// щоб не підхопити *.d.ts з dist.
const ext = __filename.endsWith('.ts') ? 'ts' : 'js';

export default new DataSource({
  ...connectionOptions,
  entities: [`${__dirname}/../**/*.entity.${ext}`],
  migrations: [`${__dirname}/migrations/*.${ext}`],
  migrationsTableName: 'migrations',
  logging: ['query', 'error', 'schema'],
});
