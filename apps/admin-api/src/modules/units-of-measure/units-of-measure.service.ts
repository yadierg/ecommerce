import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
  // CREATE
  // ============================================
  async create(
    dto: CreateUnitOfMeasureDto,
    tenantId: string,
    userId?: string,
  ): Promise<UnitOfMeasure> {
    // Verificar que no exista la abreviatura en este tenant
    const existing = await this.unitsRepository.findOne({
      where: { abbreviation: dto.abbreviation, tenantId },
    });

    if (existing) {
      throw new ConflictException(
        `La unidad "${dto.abbreviation}" ya existe en tu empresa`,
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
      .where('unit.tenantId = :tenantId', { tenantId });

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
      where: { tenantId, isActive: true },
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  // ============================================
  // FIND BY TYPE (para agrupar en dropdowns)
  // ============================================
  async findByType(tenantId: string, type: UnitType) {
    return this.unitsRepository.find({
      where: { tenantId, type, isActive: true },
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  // ============================================
  // FIND ONE
  // ============================================
  async findOne(id: string, tenantId: string): Promise<UnitOfMeasure> {
    const unit = await this.unitsRepository.findOne({
      where: { id, tenantId },
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
    const total = await this.unitsRepository.count({ where: { tenantId } });

    const active = await this.unitsRepository.count({
      where: { tenantId, isActive: true },
    });

    const byType = await this.unitsRepository
      .createQueryBuilder('unit')
      .select('unit.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('unit.tenantId = :tenantId', { tenantId })
      .groupBy('unit.type')
      .getRawMany();

    return {
      total,
      active,
      inactive: total - active,
      byType,
    };
  }
}