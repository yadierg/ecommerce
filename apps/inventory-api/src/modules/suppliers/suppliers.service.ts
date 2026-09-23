// apps/inventory-api/src/modules/suppliers/suppliers.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { Supplier } from '@ecommerce/core';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
  ) {}

  // ============================================
  // CREATE
  // ============================================
  async create(dto: CreateSupplierDto, tenantId: string): Promise<Supplier> {
    // Verificar código único por tenant
    const existing = await this.suppliersRepository.findOne({
      where: { code: dto.code, tenantId },
    });

    if (existing) {
      throw new ConflictException(
        `El código "${dto.code}" ya existe en tu empresa`,
      );
    }

    const supplier = this.suppliersRepository.create({
      ...dto,
      tenantId,
    });

    return this.suppliersRepository.save(supplier);
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(query: QuerySupplierDto, tenantId: string) {
    const {
      page = 1,
      limit = 20,
      search,
      city,
      country,
      isActive,
      isPreferred,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.suppliersRepository
      .createQueryBuilder('supplier')
      .where('supplier.tenantId = :tenantId', { tenantId });

    if (search) {
      qb.andWhere(
        '(supplier.name ILIKE :search OR supplier.code ILIKE :search OR supplier.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (city) {
      qb.andWhere('supplier.city = :city', { city });
    }

    if (country) {
      qb.andWhere('supplier.country = :country', { country });
    }

    if (isActive !== undefined) {
      qb.andWhere('supplier.isActive = :isActive', { isActive });
    }

    if (isPreferred !== undefined) {
      qb.andWhere('supplier.isPreferred = :isPreferred', { isPreferred });
    }

    qb.orderBy('supplier.isPreferred', 'DESC')
      .addOrderBy('supplier.name', 'ASC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // READ ONE
  // ============================================
  async findOne(id: string, tenantId: string): Promise<Supplier> {
    const supplier = await this.suppliersRepository.findOne({
      where: { id, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException(`Proveedor ${id} no encontrado`);
    }

    return supplier;
  }

  // ============================================
  // READ BY CODE
  // ============================================
  async findByCode(code: string, tenantId: string): Promise<Supplier> {
    const supplier = await this.suppliersRepository.findOne({
      where: { code, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException(`Proveedor "${code}" no encontrado`);
    }

    return supplier;
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(
    id: string,
    dto: UpdateSupplierDto,
    tenantId: string,
  ): Promise<Supplier> {
    const supplier = await this.findOne(id, tenantId);

    Object.assign(supplier, dto);
    return this.suppliersRepository.save(supplier);
  }

  // ============================================
  // DELETE
  // ============================================
  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const supplier = await this.findOne(id, tenantId);
    await this.suppliersRepository.remove(supplier);
    return { message: 'Proveedor eliminado' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId: string) {
    const total = await this.suppliersRepository.count({
      where: { tenantId },
    });

    const active = await this.suppliersRepository.count({
      where: { tenantId, isActive: true },
    });

    const preferred = await this.suppliersRepository.count({
      where: { tenantId, isPreferred: true },
    });

    const byCountry = await this.suppliersRepository
      .createQueryBuilder('supplier')
      .select('supplier.country', 'country')
      .addSelect('COUNT(*)', 'count')
      .where('supplier.tenantId = :tenantId', { tenantId })
      .andWhere('supplier.country IS NOT NULL')
      .groupBy('supplier.country')
      .getRawMany();

    return {
      total,
      active,
      inactive: total - active,
      preferred,
      byCountry,
    };
  }
}