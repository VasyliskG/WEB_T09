import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Некоректний email' })
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(6, { message: 'Пароль має містити щонайменше 6 символів' })
  // bcrypt враховує лише перші 72 байти пароля
  @MaxLength(72, { message: 'Пароль не може бути довшим за 72 символи' })
  @Matches(/^(?=.*[A-Za-zА-Яа-яІіЇїЄєҐґ])(?=.*\d).+$/, {
    message: 'Пароль має містити щонайменше одну літеру та одну цифру',
  })
  password: string;
}
