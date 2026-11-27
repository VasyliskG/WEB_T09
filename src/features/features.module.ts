import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureEntity } from './entities/feature.entity';
import { FeaturesService } from './features.service';
import { FeaturesController } from './features.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureEntity])],
  providers: [FeaturesService],
  controllers: [FeaturesController],
})
export class FeaturesModule {}
