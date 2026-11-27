import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureEntity } from './entities/feature.entity';
import { CreateFeatureDto } from './dto/create-feature.dto';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectRepository(FeatureEntity)
    private readonly featureRepo: Repository<FeatureEntity>,
  ) {}

  findAll(): Promise<FeatureEntity[]> {
    return (
      this.featureRepo
        .createQueryBuilder('feature')
        // зворотний бік зв'язку: лише id та назви гаджетів
        .leftJoin('feature.gadgets', 'gadget')
        .addSelect(['gadget.id', 'gadget.title'])
        .orderBy('feature.name', 'ASC')
        .addOrderBy('gadget.title', 'ASC')
        .getMany()
    );
  }

  create(dto: CreateFeatureDto): Promise<FeatureEntity> {
    return this.featureRepo.save(this.featureRepo.create(dto));
  }
}
