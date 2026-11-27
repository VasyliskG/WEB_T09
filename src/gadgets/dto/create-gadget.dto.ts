import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGadgetDto {
  @IsString({ message: 'title має бути рядком' })
  @IsNotEmpty({ message: "title є обов'язковим" })
  @MinLength(3, { message: 'title має містити щонайменше 3 символи' })
  @MaxLength(150, { message: 'title має містити не більше 150 символів' })
  readonly title: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price має бути числом' })
  @IsPositive({ message: 'price must be a positive number' })
  readonly price: number;

  @IsOptional()
  @IsString({ message: 'cpu має бути рядком' })
  @MaxLength(100, { message: 'cpu має містити не більше 100 символів' })
  readonly cpu?: string;

  @IsOptional()
  @IsInt({ message: 'ramGb має бути цілим числом' })
  @Min(1, { message: 'ramGb must not be less than 1' })
  readonly ramGb?: number;

  @IsOptional()
  @IsInt({ message: 'stock має бути цілим числом' })
  @Min(0, { message: "stock не може бути від'ємним" })
  readonly stock?: number;

  @IsOptional()
  @IsString({ message: 'description має бути рядком' })
  @MaxLength(500)
  readonly description?: string;

  @IsOptional()
  @IsBoolean({ message: 'isAvailable має бути boolean' })
  readonly isAvailable?: boolean;

  /** Зв'язок M:1 — id наявного бренду */
  @IsOptional()
  @IsUUID('4', { message: 'brandId має бути UUID' })
  readonly brandId?: string;

  /** Зв'язок M:N — назви фіч; нові створюються автоматично (cascade: true) */
  @IsOptional()
  @IsArray({ message: 'features має бути масивом рядків' })
  @ArrayMaxSize(20)
  @ArrayUnique({ message: 'features не повинен містити дублікатів' })
  @IsString({ each: true, message: 'кожна фіча має бути рядком' })
  @IsNotEmpty({ each: true, message: 'назва фічі не може бути порожньою' })
  @MaxLength(80, { each: true })
  readonly features?: string[];
}
