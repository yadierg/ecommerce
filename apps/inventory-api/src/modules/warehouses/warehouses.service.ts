// apps/inventory-api/src/modules/warehouses/warehouses.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Warehouse } from '@ecommerce/core';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehousesRepository: Repository<Warehouse>,
  ) {}

  // ============================================
  // CREATE
  // ============================================
  async create(dto: CreateWarehouseDto, tenantId: string): Promise<Warehouse> {
    // Código único por tenant
    const existing = await this.warehousesRepository.findOne({
      where: { code: dto.code, tenantId },
    });

    if (existing) {
      throw new ConflictException(
        `El código "${dto.code}" ya existe en tu empresa`,
      );
    }

    // Si es default, quitar default de los otros
    if (dto.isDefault) {
      await this.warehousesRepository.update(
        { tenantId, isDefault: true },
        { isDefault: false },
      );
    }

    // Si es el primero, marcarlo como default
    const count = await this.warehousesRepository.count({
      where: { tenantId },
    });

    const warehouse = this.warehousesRepository.create({
      ...dto,
      tenantId,
      isDefault: dto.isDefault || count === 0,
    });

    return this.warehousesRepository.save(warehouse);
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(tenantId: string, includeInactive = false) {
    const where: FindOptionsWhere<Warehouse> = { tenantId };

    if (!includeInactive) {
      where.isActive = true;
    }

    return this.warehousesRepository.find({
      where,
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  // ============================================
  // READ ONE
  // ============================================
  async findOne(id: string, tenantId: string): Promise<Warehouse> {
    const warehouse = await this.warehousesRepository.findOne({
      where: { id, tenantId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Almacén ${id} no encontrado`);
    }

    return warehouse;
  }

  // ============================================
  // READ BY CODE
  // ============================================
  async findByCode(code: string, tenantId: string): Promise<Warehouse> {
    const warehouse = await this.warehousesRepository.findOne({
      where: { code, tenantId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Almacén "${code}" no encontrado`);
    }

    return warehouse;
  }

  // ============================================
  // GET DEFAULT
  // ============================================
  async getDefault(tenantId: string): Promise<Warehouse> {
    const warehouse = await this.warehousesRepository.findOne({
      where: { tenantId, isDefault: true, isActive: true },
    });

    if (!warehouse) {
      throw new NotFoundException(
        'No hay almacén por defecto. Crea uno o marca uno como default.',
      );
    }

    return warehouse;
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(
    id: string,
    dto: UpdateWarehouseDto,
    tenantId: string,
  ): Promise<Warehouse> {
    const warehouse = await this.findOne(id, tenantId);

    if (dto.isDefault === true && !warehouse.isDefault) {
      await this.warehousesRepository.update(
        { tenantId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(warehouse, dto);
    return this.warehousesRepository.save(warehouse);
  }

  // ============================================
  // SET DEFAULT
  // ============================================
  async setDefault(id: string, tenantId: string): Promise<Warehouse> {
    const warehouse = await this.findOne(id, tenantId);

    await this.warehousesRepository.update(
      { tenantId },
      { isDefault: false },
    );

    warehouse.isDefault = true;
    return this.warehousesRepository.save(warehouse);
  }

  // ============================================
  // DELETE
  // ============================================
  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const warehouse = await this.findOne(id, tenantId);

    if (warehouse.isDefault) {
      throw new BadRequestException(
        'No se puede eliminar el almacén por defecto',
      );
    }

    await this.warehousesRepository.remove(warehouse);
    return { message: 'Almacén eliminado' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId: string) {
    const total = await this.warehousesRepository.count({
      where: { tenantId },
    });

    const active = await this.warehousesRepository.count({
      where: { tenantId, isActive: true },
    });

    const defaultWarehouse = await this.warehousesRepository.findOne({
      where: { tenantId, isDefault: true },
    });

    return {
      total,
      active,
      inactive: total - active,
      defaultWarehouse: defaultWarehouse?.name || null,
    };
  }
}