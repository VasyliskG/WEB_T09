import { SetMetadata } from '@nestjs/common';
import { Role } from '../../users/enums/role.enum';

export const ROLES_KEY = 'roles';

/** Записує перелік дозволених ролей у метадані обробника/контролера */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
