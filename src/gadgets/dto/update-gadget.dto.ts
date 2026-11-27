import { PartialType } from '@nestjs/mapped-types';
import { CreateGadgetDto } from './create-gadget.dto';

/** Часткове оновлення: усі поля CreateGadgetDto необов'язкові */
export class UpdateGadgetDto extends PartialType(CreateGadgetDto) {}
