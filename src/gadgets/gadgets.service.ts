import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { GadgetEntity } from './entities/gadget.entity';
import { BrandEntity } from '../brands/entities/brand.entity';
import { FeatureEntity } from '../features/entities/feature.entity';
import { WarrantyEntity } from '../warranties/entities/warranty.entity';
import { CreateGadgetDto } from './dto/create-gadget.dto';
import { UpdateGadgetDto } from './dto/update-gadget.dto';
import { GadgetAggregateDto } from './dto/gadget-aggregate.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { PaginatedResult } from '../common/interfaces/paginated.interface';
import { SlugService } from '../shared/slug/slug.service';

const SEED_GADGETS: GadgetAggregateDto[] = [
  {
    title: 'Флагманський смартфон',
    price: 39999,
    cpu: 'Snapdragon 8 Gen 3',
    ramGb: 12,
    stock: 10,
    brand: 'TechCorp',
    features: ['5G', 'OLED 120Hz', 'NFC'],
    warranty: {
      durationMonths: 24,
      conditions: 'Повна офіційна гарантія виробника',
    },
  },
  {
    title: 'Pro Laptop 16',
    price: 45000,
    cpu: 'Intel Core i7-13700H',
    ramGb: 16,
    stock: 8,
    description: 'Ноутбук для роботи та навчання',
    brand: 'TechCorp',
    features: ['Wi-Fi 7', 'OLED 120Hz'],
    warranty: {
      durationMonths: 12,
      conditions: 'Гарантія магазину, сервісний центр у Києві',
    },
  },
  {
    title: 'Бездротові навушники ANC',
    price: 5200,
    stock: 30,
    brand: 'SoundWave',
    features: ['ANC', 'Bluetooth 5.3'],
    warranty: {
      durationMonths: 6,
      conditions: 'Обмін протягом 14 днів, ремонт — 6 місяців',
    },
  },
];

@Injectable()
export class GadgetsService implements OnModuleInit {
  private readonly logger = new Logger(GadgetsService.name);

  constructor(
    @InjectRepository(GadgetEntity)
    private readonly gadgetRepo: Repository<GadgetEntity>,
    private readonly dataSource: DataSource,
    private readonly slugService: SlugService,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.gadgetRepo
      .count({ withDeleted: true })
      .catch((error: unknown) => {
        this.logger.error(
          'Таблиці не знайдено. Спочатку виконайте: npm run migration:run',
        );
        throw error;
      });
    if (count > 0) {
      this.logger.log(
        `У базі вже є ${count} гаджет(ів), початкові дані не додаються.`,
      );
      return;
    }
    for (const dto of SEED_GADGETS) {
      await this.createTransactional(dto);
    }
    this.logger.log(
      'Таблиця gadgets порожня — додано початкові дані з брендами, фічами та гарантіями.',
    );
  }

  // ---------------------------------------------------------------------------
  // Рівень 2: пошук і фільтрація через QueryBuilder
  // ---------------------------------------------------------------------------

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<GadgetEntity>> {
    const { page, limit, search, sortBy, order, feature, brand } = query;
    const qb = this.gadgetRepo.createQueryBuilder('gadget');

    // M:1 — при фільтрі за брендом INNER JOIN відсікає гаджети інших брендів
    // та без бренду; без фільтра LEFT JOIN залишає і гаджети без бренду.
    if (brand) {
      qb.innerJoinAndSelect(
        'gadget.brand',
        'brand',
        'LOWER(brand.name) = LOWER(:brand)',
        { brand },
      );
    } else {
      qb.leftJoinAndSelect('gadget.brand', 'brand');
    }

    // M:N — фільтр за id або назвою фічі. Умова винесена в підзапит, щоб у
    // відповіді масив features містив УСІ фічі гаджета, а не лише знайдену.
    if (feature) {
      const byId = isUUID(feature);
      qb.innerJoinAndSelect('gadget.features', 'feature').andWhere(
        (outer) => {
          const sub = outer
            .subQuery()
            .select('fg.id')
            .from(GadgetEntity, 'fg')
            .innerJoin('fg.features', 'ff')
            .where(
              byId ? 'ff.id = :feature' : 'LOWER(ff.name) = LOWER(:feature)',
            )
            .getQuery();
          return `gadget.id IN ${sub}`;
        },
        { feature },
      );
    } else {
      qb.leftJoinAndSelect('gadget.features', 'feature');
    }

    if (search) {
      qb.andWhere('gadget.title ILIKE :search', {
        search: `%${this.escapeLike(search)}%`,
      });
    }

    const [data, total] = await qb
      .orderBy(`gadget.${sortBy}`, order)
      .addOrderBy('gadget.id', 'ASC')
      .addOrderBy('feature.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ---------------------------------------------------------------------------
  // Рівень 1: отримання з relations
  // ---------------------------------------------------------------------------

  async findOne(id: string): Promise<GadgetEntity> {
    const gadget = await this.gadgetRepo.findOne({
      where: { id },
      relations: { brand: true },
    });
    if (!gadget) {
      throw new NotFoundException(`Сутність з ID ${id} не знайдена`);
    }
    return gadget;
  }

  // ---------------------------------------------------------------------------
  // Рівень 3: повний агрегат (1:1 + M:1 + M:N) одним запитом
  // ---------------------------------------------------------------------------

  async findFullAggregate(
    id: string,
    manager: EntityManager = this.gadgetRepo.manager,
  ): Promise<GadgetEntity> {
    const gadget = await manager
      .createQueryBuilder(GadgetEntity, 'gadget')
      .leftJoinAndSelect('gadget.brand', 'brand') // M:1
      .leftJoinAndSelect('gadget.features', 'feature') // M:N
      .leftJoinAndSelect('gadget.warranty', 'warranty') // 1:1
      .where('gadget.id = :id', { id })
      .orderBy('feature.name', 'ASC')
      .getOne();
    if (!gadget) {
      throw new NotFoundException(`Сутність з ID ${id} не знайдена`);
    }
    return gadget;
  }

  // ---------------------------------------------------------------------------
  // CRUD (cascade: true для фіч)
  // ---------------------------------------------------------------------------

  async create(dto: CreateGadgetDto): Promise<GadgetEntity> {
    const { features, brandId, ...fields } = dto;
    const manager = this.gadgetRepo.manager;
    if (brandId) {
      await this.ensureBrandExists(manager, brandId);
    }
    const gadget = this.gadgetRepo.create({
      ...fields,
      brandId: brandId ?? null,
      slug: this.slugService.generateSlug(dto.title),
      // нові FeatureEntity (без id) буде вставлено автоматично завдяки cascade: true
      features: await this.resolveFeatures(manager, features ?? []),
    });
    const saved = await this.gadgetRepo.save(gadget);
    return this.findFullAggregate(saved.id);
  }

  async update(id: string, dto: UpdateGadgetDto): Promise<GadgetEntity> {
    const { features, brandId, ...fields } = dto;
    const manager = this.gadgetRepo.manager;
    const gadget = await this.gadgetRepo.findOneBy({ id });
    if (!gadget) {
      throw new NotFoundException(`Сутність з ID ${id} не знайдена`);
    }
    const changes = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    ) as Partial<GadgetEntity>;
    this.gadgetRepo.merge(gadget, changes);
    if (changes.title !== undefined) {
      gadget.slug = this.slugService.generateSlug(changes.title);
    }
    if (brandId !== undefined) {
      await this.ensureBrandExists(manager, brandId);
      gadget.brandId = brandId;
    }
    if (features !== undefined) {
      gadget.features = await this.resolveFeatures(manager, features);
    }
    await this.gadgetRepo.save(gadget);
    return this.findFullAggregate(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.gadgetRepo.softDelete(id);
  }

  /**
   * Фізичне видалення. Демонструє каскади на рівні БД:
   * warranties.gadget_id ON DELETE CASCADE та gadget_features ON DELETE CASCADE.
   */
  async removePermanently(id: string): Promise<void> {
    const result = await this.gadgetRepo.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Сутність з ID ${id} не знайдена`);
    }
  }

  async restore(id: string): Promise<{ message: string; data: GadgetEntity }> {
    const gadget = await this.gadgetRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!gadget) {
      throw new NotFoundException(`Сутність з ID ${id} не знайдена`);
    }
    if (gadget.deletedAt !== null) {
      await this.gadgetRepo.restore(id);
    }
    return {
      message: 'Сутність успішно відновлена',
      data: await this.findOne(id),
    };
  }

  async decreaseStock(id: string, quantity: number): Promise<void> {
    await this.gadgetRepo.decrement({ id }, 'stock', quantity);
  }

  // ---------------------------------------------------------------------------
  // Рівень 3: атомарні операції через DataSource.transaction
  // ---------------------------------------------------------------------------

  createTransactional(dto: GadgetAggregateDto): Promise<GadgetEntity> {
    return this.saveAggregate(null, dto);
  }

  replaceTransactional(
    id: string,
    dto: GadgetAggregateDto,
  ): Promise<GadgetEntity> {
    return this.saveAggregate(id, dto);
  }

  /**
   * Створення (id = null) або повна заміна агрегата гаджета.
   * Усі INSERT/UPDATE/DELETE виконуються одним EntityManager-ом транзакції:
   * будь-який виняток усередині callback-а → ROLLBACK, інакше → COMMIT.
   */
  private async saveAggregate(
    id: string | null,
    dto: GadgetAggregateDto,
  ): Promise<GadgetEntity> {
    return this.dataSource.transaction(async (manager) => {
      let gadget: GadgetEntity;
      if (id) {
        const existing = await manager.findOneBy(GadgetEntity, { id });
        if (!existing) {
          throw new NotFoundException(`Сутність з ID ${id} не знайдена`);
        }
        gadget = existing;
      } else {
        gadget = manager.create(GadgetEntity);
      }

      // 1. Бренд (M:1): знайти або створити
      const brand = dto.brand
        ? await this.findOrCreateBrand(manager, dto.brand)
        : null;

      // 2. Базова сутність + фічі (M:N, нові вставляються через cascade)
      manager.merge(GadgetEntity, gadget, {
        title: dto.title,
        slug: this.slugService.generateSlug(dto.title),
        price: dto.price,
        cpu: dto.cpu ?? null,
        ramGb: dto.ramGb ?? null,
        stock: dto.stock ?? 0,
        description: dto.description ?? null,
        isAvailable: dto.isAvailable ?? true,
        brandId: brand?.id ?? null,
      });
      gadget.features = await this.resolveFeatures(manager, dto.features ?? []);
      const saved = await manager.save(gadget);
      this.logger.log(
        `[TX] Збережено гаджет ${saved.id} та ${gadget.features.length} фіч(і)`,
      );

      // 3. Бізнес-валідація ПІСЛЯ часткового збереження — демонстрація rollback
      if (saved.price < 0) {
        this.logger.warn("[TX] Від'ємна ціна — виконується ROLLBACK");
        throw new BadRequestException(
          "Ціна не може бути від'ємною. Транзакцію відкочено.",
        );
      }

      // 4. Гарантія (1:1): створити / оновити / видалити (повна заміна агрегата)
      const currentWarranty = await manager.findOne(WarrantyEntity, {
        where: { gadget: { id: saved.id } },
      });
      if (dto.warranty) {
        const warranty =
          currentWarranty ??
          manager.create(WarrantyEntity, { gadget: { id: saved.id } });
        manager.merge(WarrantyEntity, warranty, dto.warranty);
        await manager.save(warranty);
        this.logger.log(`[TX] Збережено гарантію ${warranty.id}`);
      } else if (currentWarranty) {
        await manager.remove(currentWarranty);
      }

      // 5. Штучний збій наприкінці — усі попередні INSERT теж будуть скасовані
      if (dto.simulateFailure) {
        this.logger.warn('[TX] Імітація збою — виконується ROLLBACK');
        throw new InternalServerErrorException(
          'Імітація збою після збереження гаджета, фіч і гарантії. Транзакцію відкочено.',
        );
      }

      return this.findFullAggregate(saved.id, manager);
    });
  }

  // ---------------------------------------------------------------------------
  // Допоміжні методи
  // ---------------------------------------------------------------------------

  /**
   * Перетворює назви фіч на сутності: наявні беруться з БД (без урахування
   * регістру), відсутні повертаються як нові об'єкти без id — їх вставить cascade.
   */
  private async resolveFeatures(
    manager: EntityManager,
    names: string[],
  ): Promise<FeatureEntity[]> {
    const unique = [
      ...new Map(names.map((name) => [name.toLowerCase(), name])).values(),
    ];
    if (unique.length === 0) {
      return [];
    }
    const existing = await manager
      .createQueryBuilder(FeatureEntity, 'feature')
      .where('LOWER(feature.name) IN (:...names)', {
        names: unique.map((n) => n.toLowerCase()),
      })
      .getMany();
    const byName = new Map(existing.map((f) => [f.name.toLowerCase(), f]));
    return unique.map(
      (name) =>
        byName.get(name.toLowerCase()) ??
        manager.create(FeatureEntity, { name }),
    );
  }

  private async findOrCreateBrand(
    manager: EntityManager,
    name: string,
  ): Promise<BrandEntity> {
    const existing = await manager
      .createQueryBuilder(BrandEntity, 'brand')
      .where('LOWER(brand.name) = LOWER(:name)', { name })
      .getOne();
    return existing ?? manager.save(manager.create(BrandEntity, { name }));
  }

  private async ensureBrandExists(
    manager: EntityManager,
    brandId: string,
  ): Promise<void> {
    const exists = await manager.existsBy(BrandEntity, { id: brandId });
    if (!exists) {
      throw new NotFoundException(`Бренд з ID ${brandId} не знайдено`);
    }
  }

  private escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (char) => `\\${char}`);
  }
}
