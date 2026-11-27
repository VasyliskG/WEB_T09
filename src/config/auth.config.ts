import { config } from 'dotenv';
import type { JwtSignOptions } from '@nestjs/jwt';

type Ttl = NonNullable<JwtSignOptions['expiresIn']>;

config({ quiet: true });

/** Параметри JWT. Секрети access та refresh токенів обов'язково різні. */
export const authConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'accessSecretKey',
  accessTtl: (process.env.JWT_ACCESS_TTL ?? '15m') as Ttl,
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'refreshSecretKey',
  refreshTtl: (process.env.JWT_REFRESH_TTL ?? '7d') as Ttl,
  /** Час життя refresh cookie, мс (збігається з refreshTtl) */
  refreshCookieMaxAge: 7 * 24 * 60 * 60 * 1000,
  saltRounds: 10,
};
