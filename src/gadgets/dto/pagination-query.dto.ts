import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const GADGET_SORT_FIELDS = [
  'createdAt',
  'title',
  'price',
  'ramGb',
  'stock',
] as const;
export type GadgetSortField = (typeof GADGET_SORT_FIELDS)[number];

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page має бути цілим числом' })
  @Min(1, { message: 'page must not be less than 1' })
  readonly page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit має бути цілим числом' })
  @Min(1, { message: 'limit must not be less than 1' })
  @Max(100, { message: 'limit must not be greater than 100' })
  readonly limit: number = 10;

  @IsOptional()
  @IsString({ message: 'search має бути рядком' })
  @MaxLength(150)
  readonly search?: string;

  @IsOptional()
  @IsIn(GADGET_SORT_FIELDS, {
    message: `sortBy має бути одним із: ${GADGET_SORT_FIELDS.join(', ')}`,
  })
  readonly sortBy: GadgetSortField = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'], { message: 'order має бути ASC або DESC' })
  readonly order: 'ASC' | 'DESC' = 'DESC';

  /** Фільтр M:N: id (UUID) або назва фічі, напр. ?feature=5G */
  @IsOptional()
  @IsString({ message: 'feature має бути рядком' })
  @MaxLength(80)
  readonly feature?: string;

  /** Фільтр M:1: назва бренду, напр. ?brand=TechCorp */
  @IsOptional()
  @IsString({ message: 'brand має бути рядком' })
  @MaxLength(100)
  readonly brand?: string;
}
