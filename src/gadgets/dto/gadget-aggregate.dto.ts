import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class WarrantyDto {
  @IsInt({ message: 'durationMonths має бути цілим числом' })
  @Min(1, { message: 'durationMonths must not be less than 1' })
  @Max(60, { message: 'durationMonths must not be greater than 60' })
  readonly durationMonths: number;

  @IsString({ message: 'conditions має бути рядком' })
  @IsNotEmpty({ message: "conditions є обов'язковим" })
  @MaxLength(2000)
  readonly conditions: string;
}

/**
 * Повний агрегат гаджета (гаджет + бренд + фічі + гарантія) для
 * транзакційного створення (POST) та повної заміни (PUT).
 *
 * Ціна навмисно НЕ перевіряється тут через @IsPositive: перевірка виконується
 * бізнес-логікою всередині транзакції ПІСЛЯ збереження частини даних, щоб
 * продемонструвати rollback.
 */
export class GadgetAggregateDto {
  @IsString({ message: 'title має бути рядком' })
  @IsNotEmpty({ message: "title є обов'язковим" })
  @MinLength(3, { message: 'title має містити щонайменше 3 символи' })
  @MaxLength(150, { message: 'title має містити не більше 150 символів' })
  readonly title: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price має бути числом' })
  readonly price: number;

  @IsOptional()
  @IsString({ message: 'cpu має бути рядком' })
  @MaxLength(100)
  readonly cpu?: string;

  @IsOptional()
  @IsInt({ message: 'ramGb має бути цілим числом' })
  @Min(1)
  readonly ramGb?: number;

  @IsOptional()
  @IsInt({ message: 'stock має бути цілим числом' })
  @Min(0, { message: "stock не може бути від'ємним" })
  readonly stock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly description?: string;

  @IsOptional()
  @IsBoolean({ message: 'isAvailable має бути boolean' })
  readonly isAvailable?: boolean;

  /** Назва бренду: знаходиться або створюється в межах транзакції */
  @IsOptional()
  @IsString({ message: 'brand має бути рядком (назва бренду)' })
  @IsNotEmpty()
  @MaxLength(100)
  readonly brand?: string;

  @IsOptional()
  @IsArray({ message: 'features має бути масивом рядків' })
  @ArrayMaxSize(20)
  @ArrayUnique({ message: 'features не повинен містити дублікатів' })
  @IsString({ each: true, message: 'кожна фіча має бути рядком' })
  @IsNotEmpty({ each: true })
  @MaxLength(80, { each: true })
  readonly features?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => WarrantyDto)
  readonly warranty?: WarrantyDto;

  /** Штучний збій наприкінці транзакції (після збереження всіх рядків) */
  @IsOptional()
  @IsBoolean()
  readonly simulateFailure?: boolean;
}
