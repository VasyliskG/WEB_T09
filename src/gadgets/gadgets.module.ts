import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GadgetsService } from './gadgets.service';
import { GadgetsController } from './gadgets.controller';
import { GadgetEntity } from './entities/gadget.entity';
import { WarrantyEntity } from '../warranties/entities/warranty.entity';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GadgetEntity, WarrantyEntity]),
    SharedModule,
  ],
  providers: [GadgetsService],
  controllers: [GadgetsController],
  exports: [GadgetsService],
})
export class GadgetsModule {}
