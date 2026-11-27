import { IsEmail, IsInt, IsUUID, Min } from 'class-validator';

export class CreateOrderDto {
  @IsUUID('4', { message: 'productId має бути UUID' })
  readonly productId: string;

  @IsInt({ message: 'quantity має бути цілим числом' })
  @Min(1, { message: 'quantity must not be less than 1' })
  readonly quantity: number;

  @IsEmail({}, { message: 'Некоректний формат email' })
  readonly customerEmail: string;
}
