// apps/admin-api/src/modules/roles/roles.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  // CREATE
  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.rolesRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`El rol "${dto.name}" ya existe`);
    }

    // Buscar permisos si se proporcionaron
    let permissions: Permission[] = [];
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      permissions = await this.permissionsRepository.find({
        where: { id: In(dto.permissionIds) },
      });

      if (permissions.length !== dto.permissionIds.length) {
        throw new BadRequestException('Algunos permisos no existen');
      }
    }

    const role = this.rolesRepository.create({
      name: dto.name,
      description: dto.description,
      category: dto.category || 'custom',
      isActive: dto.isActive ?? true,
      permissions,
    });

    return this.rolesRepository.save(role);
  }

  // READ ALL
  async findAll() {
    return this.rolesRepository.find({
      order: { name: 'ASC' },
    });
  }

  // READ ONE
  async findOne(id: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['permissions', 'users'],
    });

    if (!role) {
      throw new NotFoundException(`Rol ${id} no encontrado`);
    }

    return role;
  }

  // READ BY NAME
  async findByName(name: string): Promise<Role | null> {
    return this.rolesRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });
  }

  // UPDATE
  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    if (role.isSystem && dto.name && dto.name !== role.name) {
      throw new BadRequestException(
        'No se puede cambiar el nombre de un rol del sistema',
      );
    }

    // Actualizar permisos si se proporcionaron
    if (dto.permissionIds) {
      const permissions = await this.permissionsRepository.find({
        where: { id: In(dto.permissionIds) },
      });

      if (permissions.length !== dto.permissionIds.length) {
        throw new BadRequestException('Algunos permisos no existen');
      }

      role.permissions = permissions;
    }

    // Actualizar otros campos
    if (dto.name) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.category) role.category = dto.category;
    if (dto.isActive !== undefined) role.isActive = dto.isActive;

    return this.rolesRepository.save(role);
  }

  // DELETE
  async remove(id: string): Promise<{ message: string }> {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BadRequestException(
        'No se puede eliminar un rol del sistema',
      );
    }

    await this.rolesRepository.remove(role);
    return { message: 'Rol eliminado' };
  }

  // ASIGNAR PERMISOS
  async assignPermissions(id: string, permissionIds: string[]): Promise<Role> {
    const role = await this.findOne(id);

    const permissions = await this.permissionsRepository.find({
      where: { id: In(permissionIds) },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('Algunos permisos no existen');
    }

    role.permissions = permissions;
    return this.rolesRepository.save(role);
  }

  // STATS
  async getStats() {
    const total = await this.rolesRepository.count();
    const active = await this.rolesRepository.count({
      where: { isActive: true },
    });
    const system = await this.rolesRepository.count({
      where: { isSystem: true },
    });

    return {
      total,
      active,
      inactive: total - active,
      system,
      custom: total - system,
    };
  }
}