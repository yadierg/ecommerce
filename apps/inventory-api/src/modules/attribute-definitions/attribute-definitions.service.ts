// apps/inventory-api/src/modules/attribute-definitions/attribute-definitions.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { AttributeDefinition } from '@ecommerce/core';
import { CreateAttributeDefinitionDto } from './dto/create-attribute-definition.dto';
import { UpdateAttributeDefinitionDto } from './dto/update-attribute-definition.dto';
import { QueryAttributeDefinitionDto } from './dto/query-attribute-definition.dto';

@Injectable()
export class AttributeDefinitionsService {
  constructor(
    @InjectRepository(AttributeDefinition)
    private readonly repo: Repository<AttributeDefinition>,
  ) {}

  async create(dto: CreateAttributeDefinitionDto, tenantId: string): Promise<AttributeDefinition> {
    const existing = await this.repo.findOne({
      where: [
        { key: dto.key, productTypeId: dto.productTypeId ?? IsNull(), tenantId },
        { key: dto.key, productTypeId: dto.productTypeId ?? IsNull(), tenantId: IsNull() },
      ],
    });

    if (existing) {
      throw new ConflictException(`El atributo "${dto.key}" ya existe para este tipo`);
    }

    const entity = this.repo.create({ ...dto, tenantId, isSystem: false });
    return this.repo.save(entity);
  }

  async findAll(query: QueryAttributeDefinitionDto, tenantId: string) {
    const { page = 1, limit = 100, search, productTypeId, isFilterable } = query;
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('ad')
      .where('(ad.tenantId = :tenantId OR ad.tenantId IS NULL)', { tenantId })
      .leftJoinAndSelect('ad.productType', 'productType');

    if (productTypeId) {
      qb.andWhere('(ad.productTypeId = :productTypeId OR ad.productTypeId IS NULL)', {
        productTypeId,
      });
    }
    if (search) {
      qb.andWhere('(ad.label ILIKE :s OR ad.key ILIKE :s)', { s: `%${search}%` });
    }
    if (isFilterable !== undefined) {
      qb.andWhere('ad.isFilterable = :isFilterable', { isFilterable });
    }

    qb.orderBy('ad.orderIndex', 'ASC').addOrderBy('ad.label', 'ASC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findByProductType(productTypeId: string, tenantId: string): Promise<AttributeDefinition[]> {
    return this.repo.find({
      where: [
        { tenantId, productTypeId },
        { tenantId: IsNull(), productTypeId },
        { tenantId, productTypeId: IsNull() },
        { tenantId: IsNull(), productTypeId: IsNull() },
      ],
      order: { orderIndex: 'ASC', label: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<AttributeDefinition> {
    const entity = await this.repo.findOne({
      where: [
        { id, tenantId },
        { id, tenantId: IsNull() },
      ],
      relations: ['productType'],
    });

    if (!entity) {
      throw new NotFoundException(`AttributeDefinition ${id} no encontrado`);
    }
    return entity;
  }

  async update(id: string, dto: UpdateAttributeDefinitionDto, tenantId: string): Promise<AttributeDefinition> {
    const entity = await this.findOne(id, tenantId);

    if (entity.isSystem) {
      throw new BadRequestException('No se pueden editar atributos del sistema');
    }
    if (entity.tenantId !== tenantId) {
      throw new BadRequestException('No puedes editar atributos de otro tenant');
    }

    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const entity = await this.findOne(id, tenantId);

    if (entity.isSystem) {
      throw new BadRequestException('No se pueden eliminar atributos del sistema');
    }

    await this.repo.remove(entity);
    return { message: 'Atributo eliminado' };
  }
}