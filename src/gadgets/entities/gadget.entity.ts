import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';
import { BrandEntity } from '../../brands/entities/brand.entity';
import { FeatureEntity } from '../../features/entities/feature.entity';
import { WarrantyEntity } from '../../warranties/entities/warranty.entity';

@Entity('gadgets')
export class GadgetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'varchar', length: 180 })
  slug: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  price: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cpu: string | null;

  @Column({ type: 'integer', nullable: true })
  ramGb: number | null;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ type: 'integer', default: 0 })
  stock: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  // Власницька сторона M:1 — тут зберігається зовнішній ключ brand_id.
  // При видаленні бренду гаджети не зникають, а лишаються «без бренду».
  @ManyToOne(() => BrandEntity, (brand) => brand.gadgets, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'brand_id' })
  brand: BrandEntity | null;

  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId: string | null;

  // Власницька сторона M:N. cascade: true — нові FeatureEntity без id
  // автоматично вставляються в таблицю features під час save() гаджета.
  @ManyToMany(() => FeatureEntity, (feature) => feature.gadgets, {
    cascade: true,
  })
  @JoinTable({
    name: 'gadget_features',
    joinColumn: { name: 'gadget_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'feature_id', referencedColumnName: 'id' },
  })
  features: FeatureEntity[];

  // Інверсна сторона 1:1 (FK знаходиться в таблиці warranties)
  @OneToOne(() => WarrantyEntity, (warranty) => warranty.gadget)
  warranty: WarrantyEntity | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt: Date | null;
}
