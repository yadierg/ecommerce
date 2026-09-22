// apps/admin-api/src/modules/tenants/tenants.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, User } from '@ecommerce/core';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantsRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // ============================================
  // CREATE
  // ============================================
  async create(dto: CreateTenantDto): Promise<Tenant> {
    // Verificar slug único
    const existing = await this.tenantsRepository.findOne({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`El tenant "${dto.slug}" ya existe`);
    }

    const tenant = this.tenantsRepository.create(dto);
    return this.tenantsRepository.save(tenant);
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll() {
    const tenants = await this.tenantsRepository.find({
      order: { name: 'ASC' },
    });

    // Agregar contadores
    const withCounts = await Promise.all(
      tenants.map(async (tenant) => {
        const userCount = await this.usersRepository.count({
          where: { tenantId: tenant.id },
        });

        return {
          ...tenant,
          userCount,
        };
      }),
    );

    return withCounts;
  }

  // ============================================
  // READ ONE
  // ============================================
  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({ where: { id } });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} no encontrado`);
    }

    return tenant;
  }

  // ============================================
  // READ BY SLUG
  // ============================================
  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({ where: { slug } });

    if (!tenant) {
      throw new NotFoundException(`Tenant "${slug}" no encontrado`);
    }

    return tenant;
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    // Verificar slug si cambia
    if (dto.slug && dto.slug !== tenant.slug) {
      const existing = await this.tenantsRepository.findOne({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException(`El slug "${dto.slug}" ya existe`);
      }
    }

    Object.assign(tenant, dto);
    return this.tenantsRepository.save(tenant);
  }

  // ============================================
  // DELETE
  // ============================================
  async remove(id: string): Promise<{ message: string }> {
    const tenant = await this.findOne(id);

    // Verificar que no tenga usuarios activos
    const userCount = await this.usersRepository.count({
      where: { tenantId: id },
    });

    if (userCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el tenant porque tiene ${userCount} usuario(s) asociado(s)`,
      );
    }

    await this.tenantsRepository.remove(tenant);
    return { message: 'Tenant eliminado' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats() {
    const total = await this.tenantsRepository.count();
    const active = await this.tenantsRepository.count({
      where: { isActive: true },
    });

    return {
      total,
      active,
      inactive: total - active,
    };
  }

  // ============================================
  // GET USERS BY TENANT
  // ============================================
  async getUsers(tenantId: string) {
    return this.usersRepository.find({
      where: { tenantId },
      relations: ['roles'],
      select: ['id', 'email', 'name', 'role', 'isActive', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }
}