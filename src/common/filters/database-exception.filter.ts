import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface PgDriverError {
  code?: string;
  detail?: string;
}

/**
 * Перетворює помилки обмежень цілісності PostgreSQL на зрозумілі HTTP-відповіді
 * замість 500 Internal Server Error.
 */
@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const driverError = exception.driverError as PgDriverError;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Помилка бази даних';
    if (driverError.code === '23505') {
      status = HttpStatus.CONFLICT;
      message = `Порушено унікальність: ${driverError.detail ?? ''}`.trim();
    } else if (driverError.code === '23503') {
      status = HttpStatus.CONFLICT;
      message = `Порушено зовнішній ключ: ${driverError.detail ?? ''}`.trim();
    } else {
      this.logger.error(exception.message);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error:
        status === HttpStatus.CONFLICT ? 'Conflict' : 'Internal Server Error',
      message,
    });
  }
}
