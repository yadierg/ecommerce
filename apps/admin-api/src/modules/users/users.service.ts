// apps/admin-api/src/modules/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
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

  // ============================================
  // CREATE
  // ============================================
  async create(
    createUserDto: CreateUserDto,
    tenantId?: string,
    isSuperAdmin?: boolean,
  ): Promise<User> {
    // Verificar si el email ya existe
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Determinar tenantId efectivo
    let effectiveTenantId: string | null = null;

    if (isSuperAdmin) {
      // Super admin: puede especificar cualquier tenant
      effectiveTenantId = createUserDto.tenantId || tenantId || null;
    } else {
      // Admin normal: SOLO puede crear en su propio tenant
      effectiveTenantId = tenantId || null;
    }

    // Validar que no se cree super admin sin serlo
    if (createUserDto.isSuperAdmin && !isSuperAdmin) {
      throw new ConflictException('No puedes crear super admins');
    }

    const user = this.usersRepository.create({
      ...createUserDto,
      tenantId: effectiveTenantId,
      isSuperAdmin: isSuperAdmin ? (createUserDto.isSuperAdmin || false) : false,
    });

    const saved = await this.usersRepository.save(user);

    // Notificar
    await this.notificationsService.notifyAll({
      title: '👤 Usuario creado',
      message: `Se creó el usuario ${saved.name} (${saved.email})`,
      type: NotificationType.SUCCESS,
      priority: NotificationPriority.LOW,
      category: 'user',
      metadata: { userId: saved.id, tenantId: saved.tenantId },
    });

    delete saved.password;
    return saved;
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(tenantId?: string, isSuperAdmin?: boolean) {
    const where: FindOptionsWhere<User> = {};

    // Si no es super admin, filtrar por su tenant
    if (!isSuperAdmin && tenantId) {
      where.tenantId = tenantId;
    }

    return this.usersRepository.find({
      where,
      relations: ['roles', 'tenant'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // READ ONE
  // ============================================
  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles', 'tenant'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return user;
  }

  // ============================================
  // READ BY EMAIL (para auth)
  // ============================================
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.roles', 'roles')
      .where('user.email = :email', { email })
      .getOne();
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Si cambia email, verificar que no exista
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

  // ============================================
  // DELETE
  // ============================================
  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);

    // Notificar
    await this.notificationsService.notifyAll({
      title: '🗑️ Usuario eliminado',
      message: `Se eliminó el usuario ${user.name}`,
      type: NotificationType.WARNING,
      priority: NotificationPriority.NORMAL,
      category: 'user',
    });

    return { message: 'Usuario eliminado correctamente' };
  }

  // ============================================
  // TOGGLE ACTIVE
  // ============================================
  async toggleActive(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = !user.isActive;
    return this.usersRepository.save(user);
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId?: string, isSuperAdmin?: boolean) {
    const where: FindOptionsWhere<User> = {};

    if (!isSuperAdmin && tenantId) {
      where.tenantId = tenantId;
    }

    const total = await this.usersRepository.count({ where });
    const active = await this.usersRepository.count({
      where: { ...where, isActive: true },
    });
    const admins = await this.usersRepository.count({
      where: { ...where, role: 'admin' },
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