import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './user.entity.js';

export type PublicUser = Omit<User, 'passwordHash'>;

export const toPublicUser = (user: User): PublicUser => {
  const rest: Partial<User> = { ...user };
  delete rest.passwordHash;
  return rest as PublicUser;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create({ password, ...dto }: CreateUserDto): Promise<PublicUser> {
    const user = await this.usersRepository.save(
      this.usersRepository.create({
        ...dto,
        passwordHash: await bcrypt.hash(password, 12),
      }),
    );
    return toPublicUser(user);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async update(
    id: string,
    { password, ...dto }: UpdateUserDto,
  ): Promise<PublicUser> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    if (password) user.passwordHash = await bcrypt.hash(password, 12);
    return toPublicUser(await this.usersRepository.save(user));
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}
