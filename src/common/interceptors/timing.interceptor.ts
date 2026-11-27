import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { performance } from 'node:perf_hooks';
import { Observable, tap } from 'rxjs';

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('TIMING');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startTime = performance.now();

    const finish = () => {
      const duration = (performance.now() - startTime).toFixed(2);
      if (!response.headersSent) {
        response.setHeader('X-Response-Time', `${duration}ms`);
      }
      this.logger.log(
        `Маршрут ${request.method} ${request.originalUrl} виконано за ${duration}ms`,
      );
    };

    return next.handle().pipe(tap({ next: finish, error: finish }));
  }
}
