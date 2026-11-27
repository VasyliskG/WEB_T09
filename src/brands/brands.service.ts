import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrandEntity } from './entities/brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(BrandEntity)
    private readonly brandRepo: Repository<BrandEntity>,
  ) {}

  findAll(): Promise<BrandEntity[]> {
    return (
      this.brandRepo
        .createQueryBuilder('brand')
        // зворотний бік зв'язку: лише id та назви гаджетів
        .leftJoin('brand.gadgets', 'gadget')
        .addSelect(['gadget.id', 'gadget.title'])
        .orderBy('brand.name', 'ASC')
        .addOrderBy('gadget.title', 'ASC')
        .getMany()
    );
  }

  // Зворотний бік 1:M: бренд разом зі списком його гаджетів
  async findOne(id: string): Promise<BrandEntity> {
    const brand = await this.brandRepo.findOne({
      where: { id },
      relations: { gadgets: true },
    });
    if (!brand) {
      throw new NotFoundException(`Бренд з ID ${id} не знайдено`);
    }
    return brand;
  }

  create(dto: CreateBrandDto): Promise<BrandEntity> {
    return this.brandRepo.save(this.brandRepo.create(dto));
  }

  // FK gadgets.brand_id має ON DELETE SET NULL — гаджети залишаються без бренду
  async remove(id: string): Promise<void> {
    const result = await this.brandRepo.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Бренд з ID ${id} не знайдено`);
    }
  }
}
