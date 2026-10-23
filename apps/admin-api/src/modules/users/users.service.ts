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
import { Role } from '@ecommerce/core';
import { AuditService } from '../audit/audit.service';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
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

  // ============================================
  // ASSIGN ROLE
  // ============================================
  async assignRole(
    id: string,
    roleName: string,
    adminUserId: string,
    adminTenantId?: string | null,
    adminIsSuperAdmin?: boolean,
  ): Promise<User> {
    // 1. Buscar usuario
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // 2. Validar tenant (si no es super admin, solo su tenant)
    if (!adminIsSuperAdmin && user.tenantId !== adminTenantId) {
      throw new ConflictException('No puedes modificar usuarios de otros tenants');
    }

    // 3. Buscar el rol
    const newRole = await this.rolesRepository.findOne({
      where: { name: roleName },
    });

    if (!newRole) {
      throw new NotFoundException(`El rol "${roleName}" no existe`);
    }

    // 4. Guardar rol anterior
    const previousRole = user.role;

    // 5. Actualizar rol
    user.role = roleName;
    user.roles = [newRole];

    const updated = await this.usersRepository.save(user);

    // 6. Audit log
    await this.auditService.log({
      userId: adminUserId,
      action: 'assign_role',
      entity: 'user',
      entityId: user.id,
      description: `Rol asignado: ${previousRole} → ${roleName} para ${user.email}`,
      changes: { from: previousRole, to: roleName },
    });

    // 7. Notificar al usuario
    await this.notificationsService.create({
      userId: user.id,
      title: '🔑 Tu rol ha cambiado',
      message: `Tu rol ahora es "${roleName}". Contacta al administrador si tienes dudas.`,
      type: NotificationType.INFO,
      priority: NotificationPriority.NORMAL,
      category: 'user',
      metadata: { previousRole, newRole: roleName },
    });

    // 8. Invalidar sesiones (para que el JWT se regenere con nuevos permisos)
    // Nota: No es estrictamente necesario, el usuario puede seguir con su token actual
    // hasta que expire (15 min). Pero es más seguro forzar re-login.

    delete updated.password;
    return updated;
  }
}