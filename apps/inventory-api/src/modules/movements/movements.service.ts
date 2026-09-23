// apps/inventory-api/src/modules/movements/movements.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import {
  Movement,
  MovementType,
  Stock,
  Product,
  Warehouse,
} from '@ecommerce/core';
import { CreateMovementDto } from './dto/create-movement.dto';
import { QueryMovementDto } from './dto/query-movement.dto';

@Injectable()
export class MovementsService {
  private readonly logger = new Logger(MovementsService.name);

  constructor(
    @InjectRepository(Movement)
    private readonly movementsRepository: Repository<Movement>,
    @InjectRepository(Stock)
    private readonly stocksRepository: Repository<Stock>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Warehouse)
    private readonly warehousesRepository: Repository<Warehouse>,
  ) {}

  // ============================================
  // CREATE MANUAL
  // ============================================
  async create(
    dto: CreateMovementDto,
    tenantId: string,
    userId?: string,
  ): Promise<Movement> {
    // Verificar producto
    const product = await this.productsRepository.findOne({
      where: { id: dto.productId, tenantId },
    });
    if (!product) {
      throw new BadRequestException('Producto no encontrado');
    }

    // Verificar almacén
    const warehouse = await this.warehousesRepository.findOne({
      where: { id: dto.warehouseId, tenantId },
    });
    if (!warehouse) {
      throw new BadRequestException('Almacén no encontrado');
    }

    // Buscar stock actual
    const stock = await this.stocksRepository.findOne({
      where: {
        tenantId,
        warehouseId: dto.warehouseId,
        productId: dto.productId,
      },
    });

    const stockBefore = stock?.quantity || 0;

    if (stockBefore + dto.quantity < 0) {
      throw new BadRequestException(
        `Stock insuficiente. Actual: ${stockBefore}, movimiento: ${dto.quantity}`,
      );
    }

    const stockAfter = stockBefore + dto.quantity;

    // Actualizar stock
    if (stock) {
      stock.quantity = stockAfter;
      await this.stocksRepository.save(stock);
    } else if (dto.quantity > 0) {
      // Crear stock si no existe y es entrada
      const newStock = this.stocksRepository.create({
        tenantId,
        warehouseId: dto.warehouseId,
        productId: dto.productId,
        quantity: dto.quantity,
        reservedQuantity: 0,
        minStock: 0,
      });
      await this.stocksRepository.save(newStock);
    } else {
      throw new BadRequestException('No existe stock para realizar esta salida');
    }

    // Crear movimiento
    const movement = this.movementsRepository.create({
      ...dto,
      tenantId,
      userId,
      stockBefore,
      stockAfter,
    });

    return this.movementsRepository.save(movement);
  }

  // ============================================
  // CREATE SYSTEM (interno)
  // ============================================
  async createSystemMovement(data: {
    tenantId: string;
    warehouseId: string;
    productId: string;
    type: MovementType;
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    userId?: string;
    referenceType?: string;
    referenceId?: string;
    reason?: string;
    notes?: string;
    metadata?: Record<string, any>;
  }): Promise<Movement> {
    const movement = this.movementsRepository.create(data);
    return this.movementsRepository.save(movement);
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(query: QueryMovementDto, tenantId: string) {
    const {
      page = 1,
      limit = 20,
      from,
      to,
      ...filters
    } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Movement> = { tenantId };

    if (filters.productId) where.productId = filters.productId;
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.type) where.type = filters.type;
    if (filters.referenceType) where.referenceType = filters.referenceType;
    if (filters.referenceId) where.referenceId = filters.referenceId;

    if (from && to) {
      where.createdAt = Between(new Date(from), new Date(to));
    }

    const [data, total] = await this.movementsRepository.findAndCount({
      where,
      relations: ['product', 'warehouse', 'user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

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
  async findOne(id: string, tenantId: string): Promise<Movement> {
    const movement = await this.movementsRepository.findOne({
      where: { id, tenantId },
      relations: ['product', 'warehouse', 'user'],
    });

    if (!movement) {
      throw new NotFoundException(`Movimiento ${id} no encontrado`);
    }

    return movement;
  }

  // ============================================
  // BY PRODUCT
  // ============================================
  async findByProduct(productId: string, tenantId: string) {
    return this.movementsRepository.find({
      where: { productId, tenantId },
      relations: ['warehouse', 'user'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  // ============================================
  // BY WAREHOUSE
  // ============================================
  async findByWarehouse(warehouseId: string, tenantId: string) {
    return this.movementsRepository.find({
      where: { warehouseId, tenantId },
      relations: ['product', 'user'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId: string) {
    const total = await this.movementsRepository.count({
      where: { tenantId },
    });

    const byType = await this.movementsRepository
      .createQueryBuilder('movement')
      .select('movement.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(movement.quantity)', 'totalQuantity')
      .where('movement.tenantId = :tenantId', { tenantId })
      .groupBy('movement.type')
      .getRawMany();

    const last7Days = await this.movementsRepository
      .createQueryBuilder('movement')
      .select('DATE(movement.created_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('movement.tenantId = :tenantId', { tenantId })
      .andWhere('movement.created_at >= :date', {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      })
      .groupBy('DATE(movement.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      total,
      byType,
      last7Days,
    };
  }
}