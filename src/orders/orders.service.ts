import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GadgetsService } from '../gadgets/gadgets.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderEntity, OrderStatus } from './entities/order.entity';
import { FEE_CALCULATOR } from '../shared/config/fee-calculator.provider';
import type { FeeCalculator } from '../shared/config/fee-calculator.provider';
import { STORE_CONFIG } from '../shared/config/app-config.provider';
import type { StoreConfig } from '../shared/config/app-config.provider';

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly gadgetsService: GadgetsService,
    @Inject(FEE_CALCULATOR) private readonly feeCalculator: FeeCalculator,
    @Inject(STORE_CONFIG) private readonly storeConfig: StoreConfig,
  ) {}

  onModuleInit(): void {
    this.logger.log(
      'Сервіс замовлень успішно підключено до білінгу та каталогу.',
    );
  }

  findAll(): Promise<OrderEntity[]> {
    return this.orderRepo.find({ order: { createdAt: 'DESC' } });
  }

  async createOrder(dto: CreateOrderDto): Promise<OrderEntity> {
    const product = await this.gadgetsService.findOne(dto.productId);
    if (!product.isAvailable) {
      throw new BadRequestException(
        `Товар "${product.title}" недоступний для замовлення`,
      );
    }
    if (dto.quantity > product.stock) {
      throw new BadRequestException(
        `Недостатньо товару на складі. Доступно: ${product.stock}`,
      );
    }

    const subtotal = Math.round(product.price * dto.quantity * 100) / 100;
    const taxAmount =
      Math.round(this.feeCalculator.calculateTax(subtotal) * 100) / 100;
    const order = this.orderRepo.create({
      productId: product.id,
      productTitle: product.title,
      productSlug: product.slug,
      unitPrice: product.price,
      quantity: dto.quantity,
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
      currency: this.storeConfig.defaultCurrency,
      status: OrderStatus.Confirmed,
      customerEmail: dto.customerEmail,
    });
    const saved = await this.orderRepo.save(order);
    await this.gadgetsService.decreaseStock(product.id, dto.quantity);
    return saved;
  }
}
