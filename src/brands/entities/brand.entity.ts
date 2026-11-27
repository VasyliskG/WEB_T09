import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GadgetEntity } from '../../gadgets/entities/gadget.entity';

@Entity('brands')
export class BrandEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  country: string | null;

  // Інверсна (не власницька) сторона 1:M — колонки в таблиці brands не створює
  @OneToMany(() => GadgetEntity, (gadget) => gadget.brand)
  gadgets: GadgetEntity[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
