// apps/inventory-api/src/modules/product-types/product-types.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProductType } from '@ecommerce/core';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { QueryProductTypeDto } from './dto/query-product-type.dto';

@Injectable()
export class ProductTypesService {
  private readonly logger = new Logger(ProductTypesService.name);

  constructor(
    @InjectRepository(ProductType)
    private readonly repo: Repository<ProductType>,
  ) {}

  async create(dto: CreateProductTypeDto, tenantId: string): Promise<ProductType> {
    const existing = await this.repo.findOne({
      where: [
        { code: dto.code, tenantId },
        { code: dto.code, tenantId: IsNull() },
      ],
    });

    if (existing) {
      throw new ConflictException(`El tipo de producto "${dto.code}" ya existe`);
    }

    const entity = this.repo.create({
      ...dto,
      tenantId,
      isSystem: false,
    });

    const saved = await this.repo.save(entity);
    this.logger.log(`✅ ProductType creado: ${saved.code} (${saved.name})`);
    return saved;
  }

  async findAll(query: QueryProductTypeDto, tenantId: string) {
    const { page = 1, limit = 50, search, categoryId, isActive } = query;
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('pt')
      .where('(pt.tenantId = :tenantId OR pt.tenantId IS NULL)', { tenantId });

    if (search) {
      qb.andWhere('(pt.name ILIKE :s OR pt.code ILIKE :s OR pt.nameEn ILIKE :s)', {
        s: `%${search}%`,
      });
    }
    if (categoryId) {
      qb.andWhere('pt.categoryId = :categoryId', { categoryId });
    }
    if (isActive !== undefined) {
      qb.andWhere('pt.isActive = :isActive', { isActive });
    }

    qb.orderBy('pt.orderIndex', 'ASC').addOrderBy('pt.name', 'ASC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findActive(tenantId: string): Promise<ProductType[]> {
    return this.repo.find({
      where: [
        { tenantId, isActive: true },
        { tenantId: IsNull(), isActive: true },
      ],
      order: { orderIndex: 'ASC', name: 'ASC' },
    });
  }

  async findByCategory(categoryId: string, tenantId: string): Promise<ProductType[]> {
    return this.repo.find({
      where: [
        { tenantId, categoryId, isActive: true },
        { tenantId: IsNull(), categoryId, isActive: true },
      ],
      order: { orderIndex: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<ProductType> {
    const entity = await this.repo.findOne({
      where: [
        { id, tenantId },
        { id, tenantId: IsNull() },
      ],
      relations: ['category', 'attributeDefinitions'],
    });

    if (!entity) {
      throw new NotFoundException(`ProductType ${id} no encontrado`);
    }
    return entity;
  }

  async update(id: string, dto: UpdateProductTypeDto, tenantId: string): Promise<ProductType> {
    const entity = await this.findOne(id, tenantId);

    if (entity.isSystem) {
      throw new BadRequestException('No se pueden editar tipos del sistema');
    }
    if (entity.tenantId !== tenantId) {
      throw new BadRequestException('No puedes editar tipos de otro tenant');
    }

    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const entity = await this.findOne(id, tenantId);

    if (entity.isSystem) {
      throw new BadRequestException('No se pueden eliminar tipos del sistema');
    }

    const materialCount = await this.repo.manager.count('materials', {
      where: { productTypeId: id },
    });

    if (materialCount > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${materialCount} material(es) usan este tipo. Desactívalo.`,
      );
    }

    await this.repo.remove(entity);
    return { message: 'Tipo de producto eliminado' };
  }

  async getStats(tenantId: string) {
    const total = await this.repo.count({
      where: [{ tenantId }, { tenantId: IsNull() }],
    });
    const active = await this.repo.count({
      where: [
        { tenantId, isActive: true },
        { tenantId: IsNull(), isActive: true },
      ],
    });
    const system = await this.repo.count({ where: { tenantId: IsNull() } });
    const custom = await this.repo.count({ where: { tenantId } });

    return { total, active, inactive: total - active, system, custom };
  }
}