// apps/admin-api/src/modules/permissions/permissions.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  async create(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.permissionsRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`El permiso "${dto.name}" ya existe`);
    }

    const permission = this.permissionsRepository.create(dto);
    return this.permissionsRepository.save(permission);
  }

  async findAll(resource?: string) {
    const where = resource ? { resource } : {};
    return this.permissionsRepository.find({
      where,
      order: { resource: 'ASC', action: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permiso ${id} no encontrado`);
    }

    return permission;
  }

  async remove(id: string): Promise<{ message: string }> {
    const permission = await this.findOne(id);
    await this.permissionsRepository.remove(permission);
    return { message: 'Permiso eliminado' };
  }

  /**
   * Obtener todos los permisos agrupados por recurso
   */
  async getGrouped() {
    const permissions = await this.permissionsRepository.find({
      order: { resource: 'ASC', action: 'ASC' },
    });

    const grouped: Record<string, Permission[]> = {};
    permissions.forEach((p) => {
      if (!grouped[p.resource]) grouped[p.resource] = [];
      grouped[p.resource].push(p);
    });

    return grouped;
  }

  /**
   * Obtener lista única de recursos
   */
  async getResources(): Promise<string[]> {
    const result = await this.permissionsRepository
      .createQueryBuilder('p')
      .select('DISTINCT p.resource', 'resource')
      .orderBy('p.resource', 'ASC')
      .getRawMany();

    return result.map((r) => r.resource);
  }
}