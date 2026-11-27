import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../users/enums/role.enum';
import type { AuthUser } from '../interfaces/jwt-payload.interface';

/** Порівнює роль з req.user з ролями, дозволеними через @Roles() */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest<Request>().user as
      AuthUser | undefined;
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Недостатньо прав для виконання операції');
    }
    return true;
  }
}
