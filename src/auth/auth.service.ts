import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import { authConfig } from '../config/auth.config';
import { UsersService, type PublicUser } from '../users/users.service';
import type { UserEntity } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<PublicUser> {
    if (await this.usersService.existsByEmail(dto.email)) {
      throw new ConflictException('Користувач з таким email вже існує');
    }
    const passwordHash = await bcrypt.hash(dto.password, authConfig.saltRounds);
    // Роль не приймається від клієнта — завжди CUSTOMER (default у create)
    return this.usersService.create(dto.email, passwordHash);
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    // Однакова помилка для «немає email» і «невірний пароль» —
    // не розкриваємо, які email зареєстровані
    const isMatch =
      user !== null && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !isMatch) {
      throw new UnauthorizedException('Невірні облікові дані');
    }
    return this.issueTokens(user);
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Користувача не знайдено');
    }
    return UsersService.toPublic(user);
  }

  /** Ротація: перевіряємо refresh, видаємо нову пару, старий хеш перезаписується */
  async refresh(refreshToken: string | undefined): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.usersService.findByIdWithRefreshToken(payload.sub);
    if (!user?.hashedRefreshToken) {
      throw new UnauthorizedException('Сесію завершено');
    }
    const isMatch = await bcrypt.compare(
      AuthService.digest(refreshToken!),
      user.hashedRefreshToken,
    );
    if (!isMatch) {
      // Токен валідний за підписом, але вже замінений іншим — можлива
      // крадіжка. Анулюємо сесію повністю.
      await this.usersService.setRefreshTokenHash(user.id, null);
      throw new UnauthorizedException('Refresh token відкликано');
    }
    return this.issueTokens(user);
  }

  /** Очищає хеш refresh токена; працює навіть з простроченим access токеном */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }
    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      await this.usersService.setRefreshTokenHash(payload.sub, null);
    } catch {
      // Невалідний токен — у БД нічого анулювати, cookie однаково буде видалено
    }
  }

  private async verifyRefreshToken(
    token: string | undefined,
  ): Promise<JwtPayload> {
    if (!token) {
      throw new UnauthorizedException('Refresh token відсутній');
    }
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: authConfig.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token недійсний або прострочений',
      );
    }
  }

  private async issueTokens(user: UserEntity): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: authConfig.accessSecret,
        expiresIn: authConfig.accessTtl,
      }),
      this.jwtService.signAsync(
        { ...payload, jti: randomUUID() },
        {
          secret: authConfig.refreshSecret,
          expiresIn: authConfig.refreshTtl,
        },
      ),
    ]);

    const hashedRefreshToken = await bcrypt.hash(
      AuthService.digest(refreshToken),
      authConfig.saltRounds,
    );
    await this.usersService.setRefreshTokenHash(user.id, hashedRefreshToken);

    return { accessToken, refreshToken };
  }

  /**
   * bcrypt обрізає вхід до 72 байт, а JWT довший і має однаковий початок
   * (header + sub) у всіх токенів користувача. Без попереднього SHA-256
   * старий токен проходив би bcrypt.compare з хешем нового.
   */
  private static digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
