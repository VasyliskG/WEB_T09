import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GadgetsModule } from './gadgets/gadgets.module';
import { SharedModule } from './shared/shared.module';
import { OrdersModule } from './orders/orders.module';
import { BrandsModule } from './brands/brands.module';
import { FeaturesModule } from './features/features.module';
import { HttpLoggingMiddleware } from './common/middleware/http-logger.middleware';
import { connectionOptions } from './database/database.config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...connectionOptions, // synchronize: false — схема керується лише міграціями
      autoLoadEntities: true, // Entity з forFeature() реєструються автоматично
      logging: ['query', 'error', 'warn'],
    }),
    GadgetsModule,
    BrandsModule,
    FeaturesModule,
    SharedModule,
    OrdersModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpLoggingMiddleware).forRoutes('*');
  }
}
