import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const latency = Date.now() - startTime;
      this.logger.log(
        `${method} ${originalUrl} ${res.statusCode} +${latency}ms [${ip}]`,
      );
    });

    next();
  }
}
