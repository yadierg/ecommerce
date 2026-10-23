// apps/admin-api/src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import {
  User,
  Session,
  Role,
  NotificationType,      // ← AGREGAR
  NotificationPriority,  // ← AGREGAR
} from '@ecommerce/core';

import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';  // ← AGREGAR
import { LoginDto } from './dto/login.dto';           // ← AGREGAR
import { RegisterDto } from './dto/register.dto';     // ← AGREGAR
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,  // ← AGREGAR
  ) {}
  // ============================================
  // LOGIN
  // ============================================
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .where('user.email = :email', { email: loginDto.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Actualizar último login
    await this.usersRepository.update(user.id, { lastLogin: new Date() });

    // Generar tokens
    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    // Log de auditoría
    await this.auditService.log({
      userId: user.id,
      action: 'login',
      entity: 'auth',
      description: `Login exitoso desde ${ipAddress}`,
      ipAddress,
      userAgent,
    });

    // Extraer permisos
    const permissions = this.extractPermissions(user);

    delete user.password;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roles: user.roles?.map((r) => r.name) || [],
      },
      permissions,
      ...tokens,
    };
  }

  // ============================================
  // REGISTER
  // ============================================
  async register(registerDto: RegisterDto) {
    // 1. Verificar si existe
    const existing = await this.usersRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    // 2. Buscar rol por defecto (SIEMPRE 'user')
    const defaultRole = await this.rolesRepository.findOne({
      where: { name: 'user' },
    });

    if (!defaultRole) {
      throw new NotFoundException(
        'El rol "user" no existe. Contacta al administrador.',
      );
    }

    // 3. Crear usuario con valores FORZADOS
    const user = this.usersRepository.create({
      email: registerDto.email,
      password: registerDto.password,
      name: registerDto.name,
      role: 'user',                 // ← FORZADO
      isActive: true,                // ← FORZADO
      isSuperAdmin: false,           // ← FORZADO
      tenantId: registerDto.tenantId || null,
      roles: [defaultRole],          // ← SOLO 'user'
    });

    const saved = await this.usersRepository.save(user);

    // 4. Audit log
    await this.auditService.log({
      userId: saved.id,
      action: 'register',
      entity: 'auth',
      entityId: saved.id,
      description: `Usuario registrado: ${saved.email} (rol: user)`,
    });

    delete saved.password;

    // 5. Notificar a los admins
    await this.notificationsService.notifyAll({
      title: '🎉 Nuevo usuario registrado',
      message: `${saved.name} (${saved.email}) se ha registrado y requiere asignación de permisos`,
      type: NotificationType.INFO,
      priority: NotificationPriority.NORMAL,
      category: 'user',
      metadata: { userId: saved.id },
      actionUrl: `/users/${saved.id}`,
      actionLabel: 'Asignar permisos',
    });

    return {
      message:
        'Registro exitoso. Un administrador te asignará permisos pronto.',
      user: {
        id: saved.id,
        email: saved.email,
        name: saved.name,
        role: 'user',
      },
    };
  }
  // ============================================
  // REFRESH TOKEN
  // ============================================
  async refreshToken(refreshToken: string, ipAddress?: string, userAgent?: string) {
    const session = await this.sessionsRepository.findOne({
      where: { refreshToken, isActive: true },
      relations: ['user', 'user.roles', 'user.roles.permissions'],
    });

    if (!session) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (new Date() > session.expiresAt) {
      await this.sessionsRepository.update(session.id, { isActive: false });
      throw new UnauthorizedException('Refresh token expirado');
    }

    // Actualizar último uso
    session.lastUsedAt = new Date();
    await this.sessionsRepository.save(session);

    // Generar nuevos tokens
    const tokens = await this.generateTokens(
      session.user,
      ipAddress,
      userAgent,
    );

    // Desactivar la sesión anterior
    await this.sessionsRepository.update(session.id, { isActive: false });

    return tokens;
  }

  // ============================================
  // LOGOUT
  // ============================================
  async logout(refreshToken: string) {
    await this.sessionsRepository.update(
      { refreshToken },
      { isActive: false },
    );

    return { message: 'Sesión cerrada correctamente' };
  }

  // ============================================
  // LOGOUT ALL (cerrar todas las sesiones)
  // ============================================
  async logoutAll(userId: string) {
    await this.sessionsRepository.update(
      { userId, isActive: true },
      { isActive: false },
    );

    return { message: 'Todas las sesiones cerradas' };
  }

  // ============================================
  // VALIDATE USER (para JwtStrategy)
  // ============================================
  async validateUser(id: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { id, isActive: true },
      relations: ['roles', 'roles.permissions'],
    });

    return user;
  }

  // ============================================
  // HELPER: Generar access + refresh tokens
  // ============================================
  private async generateTokens(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Permisos del usuario
    const permissions = this.extractPermissions(user);

    // Payload del JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      roles: user.roles?.map((r) => r.name) || [],
      permissions,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin,
    };

    // Access Token (corto plazo)
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });

    // Refresh Token (largo plazo)
    const refreshToken = randomBytes(64).toString('hex');
    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');

    // Guardar sesión
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 días

    await this.sessionsRepository.save(
      this.sessionsRepository.create({
        userId: user.id,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt,
      }),
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutos en segundos
      tokenType: 'Bearer',
    };
  }

  // ============================================
  // HELPER: Extraer permisos únicos del usuario
  // ============================================
  private extractPermissions(user: User): string[] {
    if (!user.roles || user.roles.length === 0) {
      return [];
    }

    const permissionSet = new Set<string>();
    user.roles.forEach((role) => {
      role.permissions?.forEach((permission) => {
        permissionSet.add(permission.name);
      });
    });

    return Array.from(permissionSet);
  }

  // ============================================
  // GET PROFILE
  // ============================================
  async getProfile(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    delete user.password;

    return {
      ...user,
      permissions: this.extractPermissions(user),
    };
  }

  // ============================================
  // GET SESSIONS (sesiones activas)
  // ============================================
  async getSessions(userId: string) {
    return this.sessionsRepository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
      select: ['id', 'ipAddress', 'userAgent', 'lastUsedAt', 'createdAt', 'expiresAt'],
    });
  }

  // ============================================
  // CHANGE PASSWORD
  // ============================================
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 1. Buscar usuario CON password
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 2. Verificar password actual
    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    // 3. Verificar que la nueva sea diferente
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);

    if (isSamePassword) {
      throw new ConflictException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    // 4. Actualizar password (se hashea automáticamente en @BeforeUpdate)
    user.password = dto.newPassword;
    await this.usersRepository.save(user);

    // 5. Invalidar TODAS las sesiones (logout forzado)
    await this.sessionsRepository.update(
      { userId, isActive: true },
      { isActive: false },
    );

    // 6. Audit log
    await this.auditService.log({
      userId,
      action: 'change_password',
      entity: 'auth',
      entityId: userId,
      description: 'Contraseña actualizada. Sesiones invalidadas.',
      ipAddress,
      userAgent,
    });

    // 7. Notificar al usuario
    await this.notificationsService.create({
      userId,
      title: '🔒 Contraseña cambiada',
      message:
        'Tu contraseña ha sido actualizada. Todas tus sesiones han sido cerradas por seguridad.',
      type: NotificationType.WARNING,
      priority: NotificationPriority.HIGH,
      category: 'security',
      metadata: { ipAddress, userAgent },
    });

    return {
      message:
        'Contraseña actualizada. Por favor, inicia sesión de nuevo con tu nueva contraseña.',
    };
  }
}