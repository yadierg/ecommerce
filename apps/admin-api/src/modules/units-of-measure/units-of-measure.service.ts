// apps/admin-api/src/modules/units-of-measure/units-of-measure.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { UnitOfMeasure, UnitType, Product } from '@ecommerce/core';
import { CreateUnitOfMeasureDto } from './dto/create-unit-of-measure.dto';
import { UpdateUnitOfMeasureDto } from './dto/update-unit-of-measure.dto';
import { QueryUnitOfMeasureDto } from './dto/query-unit-of-measure-dto';

@Injectable()
export class UnitsOfMeasureService {
  private readonly logger = new Logger(UnitsOfMeasureService.name);

  constructor(
    @InjectRepository(UnitOfMeasure)
    private readonly unitsRepository: Repository<UnitOfMeasure>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  // ============================================
  // HELPER: Where para incluir unidades del sistema + tenant
  // ============================================
  private buildWhereWithSystem(tenantId: string) {
    return [
      { tenantId, isActive: true },
      { tenantId: IsNull(), isActive: true },
    ];
  }

  // ============================================
  // CREATE
  // ============================================
  async create(
    dto: CreateUnitOfMeasureDto,
    tenantId: string,
    userId?: string,
  ): Promise<UnitOfMeasure> {
    // Verificar que no exista la abreviatura en este tenant NI en el sistema
    const existing = await this.unitsRepository.findOne({
      where: [
        { abbreviation: dto.abbreviation, tenantId },
        { abbreviation: dto.abbreviation, tenantId: IsNull() },
      ],
    });

    if (existing) {
      throw new ConflictException(
        `La unidad "${dto.abbreviation}" ya existe`,
      );
    }

    const unit = this.unitsRepository.create({
      ...dto,
      tenantId,
      createdById: userId,
    });

    const saved = await this.unitsRepository.save(unit);
    this.logger.log(`✅ Unidad creada: ${saved.abbreviation} (${saved.name})`);

    return saved;
  }

  // ============================================
  // FIND ALL
  // ============================================
  async findAll(query: QueryUnitOfMeasureDto, tenantId: string) {
    const { page = 1, limit = 50, search, type, isActive } = query;
    const skip = (page - 1) * limit;

    const qb = this.unitsRepository
      .createQueryBuilder('unit')
      .where('(unit.tenantId = :tenantId OR unit.tenantId IS NULL)', {
        tenantId,
      });

    if (search) {
      qb.andWhere(
        '(unit.name ILIKE :search OR unit.abbreviation ILIKE :search OR unit.nameEn ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (type) {
      qb.andWhere('unit.type = :type', { type });
    }

    if (isActive !== undefined) {
      qb.andWhere('unit.isActive = :isActive', { isActive });
    }

    qb.orderBy('unit.order', 'ASC').addOrderBy('unit.name', 'ASC');
    qb.skip(skip).take(limit);

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
  // FIND ACTIVE (para dropdowns)
  // ============================================
  async findActive(tenantId: string): Promise<UnitOfMeasure[]> {
    return this.unitsRepository.find({
      where: this.buildWhereWithSystem(tenantId),
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  // ============================================
  // FIND BY TYPE (para agrupar en dropdowns)
  // ============================================
  async findByType(tenantId: string, type: UnitType) {
    return this.unitsRepository.find({
      where: [
        { tenantId, type, isActive: true },
        { tenantId: IsNull(), type, isActive: true },
      ],
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  // ============================================
  // FIND ONE
  // ============================================
  async findOne(id: string, tenantId: string): Promise<UnitOfMeasure> {
    const unit = await this.unitsRepository.findOne({
      where: [
        { id, tenantId },
        { id, tenantId: IsNull() },
      ],
    });

    if (!unit) {
      throw new NotFoundException(`Unidad ${id} no encontrada`);
    }

    return unit;
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(
    id: string,
    dto: UpdateUnitOfMeasureDto,
    tenantId: string,
  ): Promise<UnitOfMeasure> {
    const unit = await this.findOne(id, tenantId);

    if (unit.isSystem) {
      throw new BadRequestException(
        'No se pueden editar unidades del sistema',
      );
    }

    if (unit.tenantId !== tenantId) {
      throw new BadRequestException(
        'No puedes editar unidades de otro tenant',
      );
    }

    Object.assign(unit, dto);
    return this.unitsRepository.save(unit);
  }

  // ============================================
  // TOGGLE ACTIVE
  // ============================================
  async toggleActive(id: string, tenantId: string): Promise<UnitOfMeasure> {
    const unit = await this.findOne(id, tenantId);

    if (unit.isSystem) {
      throw new BadRequestException(
        'No se pueden desactivar unidades del sistema',
      );
    }

    unit.isActive = !unit.isActive;
    return this.unitsRepository.save(unit);
  }

  // ============================================
  // DELETE
  // ============================================
  async remove(
    id: string,
    tenantId: string,
  ): Promise<{ message: string }> {
    const unit = await this.findOne(id, tenantId);

    if (unit.isSystem) {
      throw new BadRequestException(
        'No se pueden eliminar unidades del sistema',
      );
    }

    if (unit.tenantId !== tenantId) {
      throw new BadRequestException(
        'No puedes eliminar unidades de otro tenant',
      );
    }

    // Verificar que no haya productos usando esta unidad
    const productCount = await this.productsRepository.count({
      where: { unitOfMeasureId: id },
    });

    if (productCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la unidad porque ${productCount} producto(s) la están usando. Desactívala en su lugar.`,
      );
    }

    await this.unitsRepository.remove(unit);
    return { message: 'Unidad eliminada' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId: string) {
    // Total: del sistema + del tenant
    const total = await this.unitsRepository.count({
      where: [
        { tenantId },
        { tenantId: IsNull() },
      ],
    });

    const active = await this.unitsRepository.count({
      where: [
        { tenantId, isActive: true },
        { tenantId: IsNull(), isActive: true },
      ],
    });

    const byType = await this.unitsRepository
      .createQueryBuilder('unit')
      .select('unit.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('(unit.tenantId = :tenantId OR unit.tenantId IS NULL)', {
        tenantId,
      })
      .groupBy('unit.type')
      .getRawMany();

    // Separar sistema vs custom
    const system = await this.unitsRepository.count({
      where: { tenantId: IsNull() },
    });

    const custom = await this.unitsRepository.count({
      where: { tenantId },
    });

    return {
      total,
      active,
      inactive: total - active,
      system,
      custom,
      byType,
    };
  }
}