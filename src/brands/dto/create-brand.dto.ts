import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBrandDto {
  @IsString({ message: 'name має бути рядком' })
  @IsNotEmpty({ message: "name є обов'язковим" })
  @MaxLength(100)
  readonly name: string;

  @IsOptional()
  @IsString({ message: 'country має бути рядком' })
  @MaxLength(80)
  readonly country?: string;
}
