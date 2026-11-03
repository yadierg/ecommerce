// apps/inventory-api/src/modules/materials/materials.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Material,
  ProductAttribute,
  AttributeDataType,
  PriceHistory,
} from '@ecommerce/core';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    @InjectRepository(Material)
    private readonly repo: Repository<Material>,
    @InjectRepository(ProductAttribute)
    private readonly attrRepo: Repository<ProductAttribute>,
    @InjectRepository(PriceHistory)
    private readonly priceRepo: Repository<PriceHistory>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateMaterialDto, tenantId: string): Promise<Material> {
    const existing = await this.repo.findOne({
      where: { sku: dto.sku, tenantId },
    });

    if (existing) {
      throw new ConflictException(`El material con SKU "${dto.sku}" ya existe`);
    }

    const { attributes, ...materialData } = dto;

    const result = await this.dataSource.transaction(async (manager) => {
      const material = manager.create(Material, {
        ...materialData,
        tenantId,
        averageCost: dto.unitCost ?? 0,
      });
      const saved = await manager.save(material);

      if (attributes && attributes.length > 0) {
        const attrs = attributes.map((a, idx) =>
          manager.create(ProductAttribute, {
            tenantId,
            materialId: saved.id,
            attributeKey: a.attributeKey,
            attributeLabel: a.attributeLabel,
            attributeValue: String(a.attributeValue),
            attributeType: (a.attributeType as AttributeDataType) ?? AttributeDataType.STRING,
            unit: a.unit,
            orderIndex: a.orderIndex ?? idx,
          }),
        );
        await manager.save(attrs);
      }

      return saved;
    });

    this.logger.log(`✅ Material creado: ${result.sku} (${result.name})`);
    return this.findOne(result.id, tenantId);
  }

  async findAll(query: QueryMaterialDto, tenantId: string) {
    const {
      page = 1,
      limit = 50,
      search,
      categoryId,
      productTypeId,
      supplierId,
      brand,
      isActive,
      isConsumable,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('m')
      .where('m.tenantId = :tenantId', { tenantId })
      .leftJoinAndSelect('m.category', 'category')
      .leftJoinAndSelect('m.productType', 'productType')
      .leftJoinAndSelect('m.unitOfMeasure', 'unitOfMeasure')
      .leftJoinAndSelect('m.supplier', 'supplier')
      .leftJoinAndSelect('m.attributes', 'attributes');

    if (search) {
      qb.andWhere('(m.name ILIKE :s OR m.sku ILIKE :s OR m.description ILIKE :s)', {
        s: `%${search}%`,
      });
    }
    if (categoryId) qb.andWhere('m.categoryId = :categoryId', { categoryId });
    if (productTypeId) qb.andWhere('m.productTypeId = :productTypeId', { productTypeId });
    if (supplierId) qb.andWhere('m.supplierId = :supplierId', { supplierId });
    if (brand) qb.andWhere('m.brand ILIKE :brand', { brand: `%${brand}%` });
    if (isActive !== undefined) qb.andWhere('m.isActive = :isActive', { isActive });
    if (isConsumable !== undefined) qb.andWhere('m.isConsumable = :isConsumable', { isConsumable });

    qb.orderBy('m.name', 'ASC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, tenantId: string): Promise<Material> {
    const entity = await this.repo.findOne({
      where: { id, tenantId },
      relations: ['category', 'productType', 'unitOfMeasure', 'supplier', 'attributes'],
    });

    if (!entity) {
      throw new NotFoundException(`Material ${id} no encontrado`);
    }
    return entity;
  }

  async findBySku(sku: string, tenantId: string): Promise<Material | null> {
    return this.repo.findOne({
      where: { sku, tenantId },
      relations: ['unitOfMeasure', 'attributes'],
    });
  }

  async update(id: string, dto: UpdateMaterialDto, tenantId: string): Promise<Material> {
    const entity = await this.findOne(id, tenantId);
    const { attributes, ...materialData } = dto;

    await this.dataSource.transaction(async (manager) => {
      Object.assign(entity, materialData);
      await manager.save(entity);

      if (attributes) {
        await manager.delete(ProductAttribute, { materialId: id });
        const attrs = attributes.map((a, idx) =>
          manager.create(ProductAttribute, {
            tenantId,
            materialId: id,
            attributeKey: a.attributeKey,
            attributeLabel: a.attributeLabel,
            attributeValue: String(a.attributeValue),
            attributeType: (a.attributeType as AttributeDataType) ?? AttributeDataType.STRING,
            unit: a.unit,
            orderIndex: a.orderIndex ?? idx,
          }),
        );
        if (attrs.length > 0) await manager.save(attrs);
      }
    });

    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const entity = await this.findOne(id, tenantId);
    await this.repo.remove(entity);
    return { message: 'Material eliminado' };
  }

  async toggleActive(id: string, tenantId: string): Promise<Material> {
    const entity = await this.findOne(id, tenantId);
    entity.isActive = !entity.isActive;
    return this.repo.save(entity);
  }

  /**
   * Recalcula averageCost a partir del historial de precios
   * Fórmula: costo promedio ponderado por cantidad
   */
  async recalculateAverageCost(materialId: string, tenantId: string): Promise<Material> {
    const material = await this.findOne(materialId, tenantId);

    const rows = await this.priceRepo
      .createQueryBuilder('ph')
      .select('SUM(ph.unitCost * ph.quantity)', 'totalValue')
      .addSelect('SUM(ph.quantity)', 'totalQty')
      .where('ph.materialId = :materialId', { materialId })
      .andWhere('ph.tenantId = :tenantId', { tenantId })
      .getRawOne();

    const totalValue = Number(rows?.totalValue ?? 0);
    const totalQty = Number(rows?.totalQty ?? 0);

    if (totalQty > 0) {
      material.averageCost = totalValue / totalQty;
      material.unitCost = material.averageCost;
    }

    const last = await this.priceRepo.findOne({
      where: { materialId, tenantId },
      order: { purchaseDate: 'DESC', createdAt: 'DESC' },
    });
    if (last) material.lastPurchaseCost = Number(last.unitCost);

    return this.repo.save(material);
  }

  async getStats(tenantId: string) {
    const total = await this.repo.count({ where: { tenantId } });
    const active = await this.repo.count({ where: { tenantId, isActive: true } });
    const consumable = await this.repo.count({ where: { tenantId, isConsumable: true } });

    const byType = await this.repo
      .createQueryBuilder('m')
      .select('m.productTypeId', 'productTypeId')
      .addSelect('COUNT(*)', 'count')
      .where('m.tenantId = :tenantId', { tenantId })
      .groupBy('m.productTypeId')
      .getRawMany();

    return { total, active, inactive: total - active, consumable, byType };
  }
}