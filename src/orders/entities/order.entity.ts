import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';

export enum OrderStatus {
  Confirmed = 'CONFIRMED',
  Cancelled = 'CANCELLED',
}

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  orderId: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'varchar', length: 150 })
  productTitle: string;

  @Column({ type: 'varchar', length: 180 })
  productSlug: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitPrice: number;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  subtotal: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  taxAmount: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  total: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.Confirmed })
  status: OrderStatus;

  @Column({ type: 'varchar', length: 100 })
  customerEmail: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
