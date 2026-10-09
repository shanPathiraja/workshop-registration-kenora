import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; user: User }> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('lower(u.email) = lower(:email)', { email })
      .getOne();

    const ok =
      user?.isActive && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !ok) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return { accessToken, user };
  }

  async me(id: string): Promise<User> {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new UnauthorizedException('Please sign in');
    return user;
  }
}
