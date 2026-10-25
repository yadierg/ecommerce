/// apps/inventory-api/src/modules/stocks/stocks.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, MoreThan } from 'typeorm';
import {
  Stock,
  Product,
  Warehouse,
  Movement,          // ← AÑADIR
  MovementType,      // ← AÑADIR
} from '@ecommerce/core';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { QueryStockDto } from './dto/query-stock.dto';
import { InitialStockDto } from './dto/initial-stock.dto';  // ← AÑADIR

@Injectable()
export class StocksService {
  private readonly logger = new Logger(StocksService.name);

  constructor(
    @InjectRepository(Stock)
    private readonly stocksRepository: Repository<Stock>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Warehouse)
    private readonly warehousesRepository: Repository<Warehouse>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================
  // CREATE
  // ============================================
  async create(dto: CreateStockDto, tenantId: string): Promise<Stock> {
    // Verificar producto del mismo tenant
    const product = await this.productsRepository.findOne({
      where: { id: dto.productId, tenantId },
    });

    if (!product) {
      throw new BadRequestException('Producto no encontrado en tu empresa');
    }

    // Verificar almacén del mismo tenant
    const warehouse = await this.warehousesRepository.findOne({
      where: { id: dto.warehouseId, tenantId },
    });

    if (!warehouse) {
      throw new BadRequestException('Almacén no encontrado en tu empresa');
    }

    // Verificar duplicado
    const existing = await this.stocksRepository.findOne({
      where: {
        tenantId,
        warehouseId: dto.warehouseId,
        productId: dto.productId,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe stock de este producto en este almacén',
      );
    }

    const stock = this.stocksRepository.create({
      ...dto,
      tenantId,
      reservedQuantity: 0,
    });

    return this.stocksRepository.save(stock);
  }

  // ============================================
  // UPSERT (crear o actualizar)
  // ============================================
  async upsert(dto: CreateStockDto, tenantId: string): Promise<Stock> {
    const existing = await this.stocksRepository.findOne({
      where: {
        tenantId,
        warehouseId: dto.warehouseId,
        productId: dto.productId,
      },
    });

    if (existing) {
      existing.quantity = dto.quantity;
      if (dto.minStock !== undefined) existing.minStock = dto.minStock;
      if (dto.maxStock !== undefined) existing.maxStock = dto.maxStock;
      if (dto.location !== undefined) existing.location = dto.location;
      if (dto.shelf !== undefined) existing.shelf = dto.shelf;
      if (dto.bin !== undefined) existing.bin = dto.bin;
      if (dto.notes !== undefined) existing.notes = dto.notes;

      return this.stocksRepository.save(existing);
    }

    return this.create(dto, tenantId);
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(query: QueryStockDto, tenantId: string) {
    const { page = 1, limit = 20, warehouseId, productId, lowStock, outOfStock } = query;
    const skip = (page - 1) * limit;

    const qb = this.stocksRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('stock.warehouse', 'warehouse')
      .where('stock.tenantId = :tenantId', { tenantId });

    if (warehouseId) {
      qb.andWhere('stock.warehouseId = :warehouseId', { warehouseId });
    }

    if (productId) {
      qb.andWhere('stock.productId = :productId', { productId });
    }

    if (lowStock) {
      qb.andWhere('stock.quantity <= stock.minStock');
      qb.andWhere('stock.quantity > 0');
    }

    if (outOfStock) {
      qb.andWhere('stock.quantity = 0');
    }

    qb.orderBy('product.name', 'ASC')
      .addOrderBy('warehouse.name', 'ASC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((s) => ({
        ...s,
        availableQuantity: s.quantity - s.reservedQuantity,
      })),
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
  async findOne(id: string, tenantId: string): Promise<Stock> {
    const stock = await this.stocksRepository.findOne({
      where: { id, tenantId },
      relations: ['product', 'warehouse'],
    });

    if (!stock) {
      throw new NotFoundException(`Stock ${id} no encontrado`);
    }

    return stock;
  }

  // ============================================
  // READ BY WAREHOUSE
  // ============================================
  async findByWarehouse(warehouseId: string, tenantId: string) {
    return this.stocksRepository.find({
      where: { warehouseId, tenantId },
      relations: ['product'],
      order: { quantity: 'DESC' },
    });
  }

  // ============================================
  // READ BY PRODUCT (todos los almacenes)
  // ============================================
  async findByProduct(productId: string, tenantId: string) {
    const stocks = await this.stocksRepository.find({
      where: { productId, tenantId },
      relations: ['warehouse'],
    });

    const totalQuantity = stocks.reduce((sum, s) => sum + s.quantity, 0);
    const totalReserved = stocks.reduce(
      (sum, s) => sum + s.reservedQuantity,
      0,
    );

    return {
      productId,
      totalQuantity,
      totalReserved,
      totalAvailable: totalQuantity - totalReserved,
      stocks: stocks.map((s) => ({
        ...s,
        availableQuantity: s.quantity - s.reservedQuantity,
      })),
    };
  }

  // ============================================
  // LOW STOCK
  // ============================================
  async findLowStock(tenantId: string) {
    return this.stocksRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('stock.warehouse', 'warehouse')
      .where('stock.tenantId = :tenantId', { tenantId })
      .andWhere('stock.quantity <= stock.minStock')
      .andWhere('stock.quantity > 0')
      .orderBy('stock.quantity', 'ASC')
      .getMany();
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(
    id: string,
    dto: UpdateStockDto,
    tenantId: string,
  ): Promise<Stock> {
    const stock = await this.findOne(id, tenantId);

    Object.assign(stock, dto);
    return this.stocksRepository.save(stock);
  }

  // ============================================
  // ADJUST (entrada/salida manual)
  // ============================================
  async adjust(
    id: string,
    dto: AdjustStockDto,
    tenantId: string,
    userId?: string,
  ): Promise<Stock> {
    const stock = await this.findOne(id, tenantId);

    const newQuantity = stock.quantity + dto.quantity;

    if (newQuantity < 0) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${stock.quantity}, ajuste: ${dto.quantity}`,
      );
    }

    stock.quantity = newQuantity;
    stock.notes = dto.notes
      ? `${stock.notes || ''}\n[Ajuste]: ${dto.reason} (${dto.quantity > 0 ? '+' : ''}${dto.quantity})`
      : stock.notes;

    this.logger.log(
      `📦 Ajuste de stock: ${stock.productId} en ${stock.warehouseId}: ${dto.quantity > 0 ? '+' : ''}${dto.quantity} (${dto.reason})`,
    );

    return this.stocksRepository.save(stock);
  }

  // ============================================
  // TRANSFER entre almacenes
  // ============================================
  async transfer(dto: TransferStockDto, tenantId: string): Promise<{
    from: Stock;
    to: Stock;
    message: string;
  }> {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException(
        'El almacén de origen y destino deben ser diferentes',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Stock origen
      const fromStock = await manager.findOne(Stock, {
        where: {
          productId: dto.productId,
          warehouseId: dto.fromWarehouseId,
          tenantId,
        },
      });

      if (!fromStock) {
        throw new NotFoundException('Producto no encontrado en almacén origen');
      }

      if (fromStock.quantity < dto.quantity) {
        throw new BadRequestException(
          `Stock insuficiente en origen. Disponible: ${fromStock.quantity}`,
        );
      }

      // 2. Stock destino (crear si no existe)
      let toStock = await manager.findOne(Stock, {
        where: {
          productId: dto.productId,
          warehouseId: dto.toWarehouseId,
          tenantId,
        },
      });

      if (!toStock) {
        toStock = manager.create(Stock, {
          tenantId,
          productId: dto.productId,
          warehouseId: dto.toWarehouseId,
          quantity: 0,
          reservedQuantity: 0,
          minStock: 0,
        });
        toStock = await manager.save(toStock);
      }

      // 3. Transferir
      fromStock.quantity -= dto.quantity;
      toStock.quantity += dto.quantity;

      await manager.save(fromStock);
      await manager.save(toStock);

      this.logger.log(
        `🔄 Transferencia: ${dto.quantity} unidades de ${dto.fromWarehouseId} → ${dto.toWarehouseId}`,
      );

      return {
        from: fromStock,
        to: toStock,
        message: `Transferencia exitosa: ${dto.quantity} unidades`,
      };
    });
  }

  // ============================================
  // DELETE
  // ============================================
  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const stock = await this.findOne(id, tenantId);

    if (stock.quantity > 0) {
      throw new BadRequestException(
        'No se puede eliminar un stock con cantidad mayor a 0',
      );
    }

    await this.stocksRepository.remove(stock);
    return { message: 'Stock eliminado' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId: string) {
    const total = await this.stocksRepository.count({
      where: { tenantId },
    });

    const totalQuantity = await this.stocksRepository
      .createQueryBuilder('stock')
      .select('SUM(stock.quantity)', 'total')
      .where('stock.tenantId = :tenantId', { tenantId })
      .getRawOne();

    const lowStockCount = await this.stocksRepository
      .createQueryBuilder('stock')
      .where('stock.tenantId = :tenantId', { tenantId })
      .andWhere('stock.quantity <= stock.minStock')
      .andWhere('stock.quantity > 0')
      .getCount();

    const outOfStockCount = await this.stocksRepository.count({
      where: { tenantId, quantity: 0 },
    });

    const byWarehouse = await this.stocksRepository
      .createQueryBuilder('stock')
      .leftJoin('stock.warehouse', 'warehouse')
      .select('warehouse.name', 'warehouseName')
      .addSelect('SUM(stock.quantity)', 'totalQuantity')
      .addSelect('COUNT(*)', 'productCount')
      .where('stock.tenantId = :tenantId', { tenantId })
      .groupBy('warehouse.id')
      .addGroupBy('warehouse.name')
      .getRawMany();

    return {
      total,
      totalQuantity: parseInt(totalQuantity?.total || '0', 10),
      lowStockCount,
      outOfStockCount,
      byWarehouse,
    };
  }

  // ============================================
  // INITIAL STOCK (Carga inicial de inventario)
  // ============================================
  async initialStock(
    dto: InitialStockDto,
    tenantId: string,
    userId?: string,
  ): Promise<{
    created: number;
    updated: number;
    movements: number;
    details: Array<{
      productId: string;
      productName: string;
      quantity: number;
      stockBefore: number;
      stockAfter: number;
      action: 'created' | 'updated';
    }>;
  }> {
    // 1. Validar almacén
    const warehouse = await this.warehousesRepository.findOne({
      where: { id: dto.warehouseId, tenantId },
    });

    if (!warehouse) {
      throw new NotFoundException('Almacén no encontrado en tu empresa');
    }

    let created = 0;
    let updated = 0;
    let movements = 0;
    const details: Array<{
      productId: string;
      productName: string;
      quantity: number;
      stockBefore: number;
      stockAfter: number;
      action: 'created' | 'updated';
    }> = [];

    // 2. Transacción: procesar todos los items
    await this.dataSource.transaction(async (manager) => {
      for (const item of dto.items) {
        // 2.1 Validar producto
        const product = await manager.findOne(Product, {
          where: { id: item.productId, tenantId },
        });

        if (!product) {
          throw new BadRequestException(
            `Producto ${item.productId} no encontrado en tu empresa`,
          );
        }

        // 2.2 Buscar stock existente
        let stock = await manager.findOne(Stock, {
          where: {
            tenantId,
            warehouseId: dto.warehouseId,
            productId: item.productId,
          },
        });

        const stockBefore = Number(stock?.quantity) || 0;
        const quantity = Number(item.quantity) || 0;
        const stockAfter = stockBefore + quantity;

        let action: 'created' | 'updated';

        if (!stock) {
          // 2.3 Crear stock nuevo
          stock = manager.create(Stock, {
            tenantId,
            warehouseId: dto.warehouseId,
            productId: item.productId,
            quantity,
            reservedQuantity: 0,
            minStock: 0,
            location: item.location,
            notes: item.notes
              ? `[Carga inicial]: ${item.notes}`
              : '[Carga inicial de inventario]',
          });
          await manager.save(stock);
          created++;
          action = 'created';
        } else {
          // 2.4 Actualizar stock existente
          stock.quantity = stockAfter;
          if (item.location) stock.location = item.location;
          if (item.notes) {
            stock.notes = stock.notes
              ? `${stock.notes}\n[Carga inicial]: ${item.notes}`
              : `[Carga inicial]: ${item.notes}`;
          }
          await manager.save(stock);
          updated++;
          action = 'updated';
        }

        // 2.5 Crear movimiento INITIAL para trazabilidad
        const movement = manager.create(Movement, {
          tenantId,
          warehouseId: dto.warehouseId,
          productId: item.productId,
          userId,
          type: MovementType.INITIAL,
          quantity,
          stockBefore,
          stockAfter,
          referenceType: 'initial_stock',
          referenceId: null,
          reason:
            dto.reason ||
            'Carga inicial de inventario (sin proveedor ni factura)',
          notes: [
            item.lotNumber ? `Lote: ${item.lotNumber}` : null,
            item.estimatedAcquisitionDate
              ? `Fecha estimada: ${item.estimatedAcquisitionDate}`
              : null,
            item.unitCost ? `Costo estimado: ${item.unitCost}` : null,
            item.notes ? `Notas: ${item.notes}` : null,
          ]
            .filter(Boolean)
            .join(' | '),
        });
        await manager.save(movement);
        movements++;

        // 2.6 Añadir al detalle
        details.push({
          productId: item.productId,
          productName: product.name,
          quantity,
          stockBefore,
          stockAfter,
          action,
        });

        this.logger.log(
          `📦 [INITIAL] ${product.name}: +${quantity} (${stockBefore} → ${stockAfter})`,
        );
      }
    });

    this.logger.log(
      `✅ Carga inicial completa: ${created} creados, ${updated} actualizados, ${movements} movimientos (Almacén: ${warehouse.name})`,
    );

    return { created, updated, movements, details };
  }
}