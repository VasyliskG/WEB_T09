import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { GadgetEntity } from '../../gadgets/entities/gadget.entity';

@Entity('features')
export class FeatureEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  name: string;

  // Інверсна сторона M:N — таблицю зв'язку описує @JoinTable у GadgetEntity
  @ManyToMany(() => GadgetEntity, (gadget) => gadget.features)
  gadgets: GadgetEntity[];
}
