import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateFeatureDto {
  @IsString({ message: 'name має бути рядком' })
  @IsNotEmpty({ message: "name є обов'язковим" })
  @MaxLength(80)
  readonly name: string;
}
