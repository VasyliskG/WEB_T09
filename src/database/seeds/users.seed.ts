import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { authConfig } from '../../config/auth.config';
import { UserEntity } from '../../users/entities/user.entity';
import { Role } from '../../users/enums/role.enum';

/**
 * Створює привілейованих користувачів (ADMIN, STORE_MANAGER), яких
 * неможливо отримати через публічну реєстрацію. Ідемпотентний:
 * наявний користувач отримує актуальні роль і пароль.
 */
async function seed(): Promise<void> {
  const accounts = [
    {
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
      password: process.env.SEED_ADMIN_PASSWORD,
      role: Role.ADMIN,
    },
    {
      email: process.env.SEED_MANAGER_EMAIL ?? 'manager@example.com',
      password: process.env.SEED_MANAGER_PASSWORD,
      role: Role.STORE_MANAGER,
    },
  ];

  await dataSource.initialize();
  const repo = dataSource.getRepository(UserEntity);
  try {
    for (const { email, password, role } of accounts) {
      if (!password) {
        throw new Error(`Не задано пароль для ${email} у .env`);
      }
      const passwordHash = await bcrypt.hash(password, authConfig.saltRounds);
      await repo.upsert({ email: email.toLowerCase(), passwordHash, role }, [
        'email',
      ]);
      console.log(`✔ ${role}: ${email}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
