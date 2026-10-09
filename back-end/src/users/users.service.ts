import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { QueryFailedError, Repository } from 'typeorm';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './user.entity.js';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create({ password, ...dto }: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create({
      ...dto,
      email: dto.email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
    });
    return this.saveUnique(user);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'ASC' } });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(
    id: string,
    { password, ...dto }: UpdateUserDto,
    authUserId: string,
  ): Promise<User> {
    const user = await this.findOne(id);
    if (id === authUserId) {
      if (dto.role !== undefined && dto.role !== user.role) {
        throw new BadRequestException('You cannot change your own role');
      }
      if (dto.isActive === false) {
        throw new BadRequestException('You cannot deactivate your own account');
      }
    }
    // Only copy fields that were sent: the validated DTO instance carries
    // every declared property, with unsent ones set to undefined.
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined) user.email = dto.email.toLowerCase();
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (password) user.passwordHash = await bcrypt.hash(password, 12);
    return this.saveUnique(user);
  }

  async deactivate(id: string, authUserId: string): Promise<void> {
    if (id === authUserId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    const user = await this.findOne(id);
    user.isActive = false;
    await this.usersRepository.save(user);
  }

  private async saveUnique(user: User): Promise<User> {
    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      const code = (error as QueryFailedError & { code?: string }).code;
      if (error instanceof QueryFailedError && code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException('A user with this email already exists');
      }
      throw error;
    }
  }
}
