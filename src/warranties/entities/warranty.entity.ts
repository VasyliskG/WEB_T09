import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GadgetEntity } from '../../gadgets/entities/gadget.entity';

@Entity('warranties')
export class WarrantyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer' })
  durationMonths: number;

  @Column({ type: 'text' })
  conditions: string;

  // Власницька сторона 1:1: тут лежить унікальний FK gadget_id.
  // ON DELETE CASCADE — фізичне видалення гаджета видаляє і гарантію.
  @OneToOne(() => GadgetEntity, (gadget) => gadget.warranty, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'gadget_id' })
  gadget: GadgetEntity;
}
