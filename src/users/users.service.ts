import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { Role } from './enums/role.enum';

/** Користувач без секретних полів — те, що віддається клієнту */
export type PublicUser = Omit<
  UserEntity,
  'passwordHash' | 'hashedRefreshToken'
>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOneBy({ id });
  }

  existsByEmail(email: string): Promise<boolean> {
    return this.usersRepository.existsBy({ email });
  }

  /** Пошук для логіну: явно довантажуємо passwordHash (select: false) */
  findByEmailWithPassword(email: string): Promise<UserEntity | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  /** Пошук для refresh: явно довантажуємо hashedRefreshToken */
  findByIdWithRefreshToken(id: string): Promise<UserEntity | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.hashedRefreshToken')
      .where('user.id = :id', { id })
      .getOne();
  }

  async create(
    email: string,
    passwordHash: string,
    role: Role = Role.CUSTOMER,
  ): Promise<PublicUser> {
    const saved = await this.usersRepository.save(
      this.usersRepository.create({ email, passwordHash, role }),
    );
    return UsersService.toPublic(saved);
  }

  async setRefreshTokenHash(id: string, hash: string | null): Promise<void> {
    await this.usersRepository.update(id, { hashedRefreshToken: hash });
  }

  static toPublic(user: UserEntity): PublicUser {
    const { id, email, role, createdAt, updatedAt } = user;
    return { id, email, role, createdAt, updatedAt };
  }
}
