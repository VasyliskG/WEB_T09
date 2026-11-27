import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { TrimPipe } from './common/pipes/trim.pipe';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { TimingInterceptor } from './common/interceptors/timing.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Розбирає заголовок Cookie у req.cookies (потрібно для refresh token)
  app.use(cookieParser());

  app.useGlobalPipes(
    new TrimPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(
    new DatabaseExceptionFilter(),
    new GlobalExceptionFilter(),
  );
  app.useGlobalInterceptors(new TimingInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
