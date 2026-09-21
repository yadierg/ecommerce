// apps/admin-api/src/modules/users/users.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, NotificationType, NotificationPriority } from '@ecommerce/core';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // CREATE
  async create(createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const user = this.usersRepository.create(createUserDto);
    const saved = await this.usersRepository.save(user);

    delete saved.password;

    // Notificar
    await this.notificationsService.notifyAll({
      title: '👤 Usuario creado',
      message: `Se creó el usuario ${saved.name}`,
      type: NotificationType.SUCCESS,
      priority: NotificationPriority.LOW,
      category: 'user',
      metadata: { userId: saved.id },
    });

    return saved;
  }

  // READ ALL
  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  // READ ONE
  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return user;
  }

  // READ BY EMAIL (para login)
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  // UPDATE
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existing = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existing) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    Object.assign(user, updateUserDto);
    const updated = await this.usersRepository.save(user);

    delete updated.password;
    return updated;
  }

  // DELETE
  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    return { message: 'Usuario eliminado correctamente' };
  }

  // TOGGLE ACTIVE
  async toggleActive(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = !user.isActive;
    return this.usersRepository.save(user);
  }

  // STATS
  async getStats() {
    const total = await this.usersRepository.count();
    const active = await this.usersRepository.count({
      where: { isActive: true },
    });
    const admins = await this.usersRepository.count({
      where: { role: 'admin' },
    });

    return {
      total,
      active,
      inactive: total - active,
      admins,
      regularUsers: total - admins,
    };
  }
}