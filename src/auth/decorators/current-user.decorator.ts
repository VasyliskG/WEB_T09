import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../interfaces/jwt-payload.interface';

/**
 * @CurrentUser()      — весь об'єкт req.user
 * @CurrentUser('id')  — окреме поле
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as AuthUser | undefined;
    return data ? user?.[data] : user;
  },
);
