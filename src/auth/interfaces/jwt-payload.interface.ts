import { Role } from '../../users/enums/role.enum';

/** Корисне навантаження JWT */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  /** Унікальний id токена — нова пара завжди відрізняється від попередньої */
  jti?: string;
}

/** Об'єкт, який JwtStrategy.validate() записує у req.user */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}
