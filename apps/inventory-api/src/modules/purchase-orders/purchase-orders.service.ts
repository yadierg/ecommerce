// apps/inventory-api/src/modules/purchase-orders/purchase-orders.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  Supplier,
  Warehouse,
  Product,
  Stock,
  Movement,
  MovementType,
} from '@ecommerce/core';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { QueryPurchaseOrderDto } from './dto/query-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly poItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
    @InjectRepository(Warehouse)
    private readonly warehousesRepository: Repository<Warehouse>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================
  // GENERAR NÚMERO DE ORDEN
  // ============================================
  private async generateOrderNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const prefix = `PO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.poRepository.count({ where: { tenantId } });
    const sequence = String(count + 1).padStart(5, '0');

    return `${prefix}-${sequence}`;
  }

  // ============================================
  // CREATE
  // ============================================
  async create(
    dto: CreatePurchaseOrderDto,
    tenantId: string,
    userId?: string,
  ): Promise<PurchaseOrder> {
    // Verificar proveedor
    const supplier = await this.suppliersRepository.findOne({
      where: { id: dto.supplierId, tenantId },
    });
    if (!supplier) {
      throw new BadRequestException('Proveedor no encontrado');
    }

    // Verificar almacén
    const warehouse = await this.warehousesRepository.findOne({
      where: { id: dto.warehouseId, tenantId },
    });
    if (!warehouse) {
      throw new BadRequestException('Almacén no encontrado');
    }

    // Verificar productos
    for (const item of dto.items) {
      const product = await this.productsRepository.findOne({
        where: { id: item.productId, tenantId },
      });
      if (!product) {
        throw new BadRequestException(
          `Producto ${item.productId} no encontrado`,
        );
      }
    }

    // Generar número
    const orderNumber = await this.generateOrderNumber(tenantId);

    // Calcular totales
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    const tax = dto.items.reduce(
      (sum, item) =>
        sum + item.quantity * item.unitPrice * ((item.taxRate || 0) / 100),
      0,
    );

    const shipping = dto.shipping || 0;
    const discount = dto.discount || 0;
    const total = subtotal + tax + shipping - discount;

    // Crear orden
    const po = this.poRepository.create({
      tenantId,
      supplierId: dto.supplierId,
      warehouseId: dto.warehouseId,
      createdById: userId,
      orderNumber,
      status: PurchaseOrderStatus.DRAFT,
      orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
      expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
      currency: dto.currency || 'USD',
      paymentTerms: dto.paymentTerms || 0,
      subtotal,
      tax,
      shipping,
      discount,
      total,
      notes: dto.notes,
      internalReference: dto.internalReference,
      items: dto.items.map((item) => {
        const product = null; // se rellena abajo
        return this.poItemRepository.create({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
          taxRate: item.taxRate || 0,
          notes: item.notes,
        });
      }),
    });

    // Snapshot de productos
    for (let i = 0; i < po.items.length; i++) {
      const product = await this.productsRepository.findOne({
        where: { id: dto.items[i].productId },
      });
      if (product) {
        po.items[i].productName = product.name;
        po.items[i].productSku = product.sku;
      }
    }

    return this.poRepository.save(po);
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(query: QueryPurchaseOrderDto, tenantId: string) {
    const { page = 1, limit = 20, from, to, search, ...filters } = query;
    const skip = (page - 1) * limit;

    const qb = this.poRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.items', 'items')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.warehouse', 'warehouse')
      .where('po.tenantId = :tenantId', { tenantId });

    if (filters.supplierId) {
      qb.andWhere('po.supplierId = :supplierId', {
        supplierId: filters.supplierId,
      });
    }

    if (filters.warehouseId) {
      qb.andWhere('po.warehouseId = :warehouseId', {
        warehouseId: filters.warehouseId,
      });
    }

    if (filters.status) {
      qb.andWhere('po.status = :status', { status: filters.status });
    }

    if (search) {
      qb.andWhere('po.orderNumber ILIKE :search', { search: `%${search}%` });
    }

    if (from && to) {
      qb.andWhere('po.orderDate BETWEEN :from AND :to', { from, to });
    }

    qb.orderBy('po.createdAt', 'DESC').skip(skip).take(limit);

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
  async findOne(id: string, tenantId: string): Promise<PurchaseOrder> {
    const po = await this.poRepository.findOne({
      where: { id, tenantId },
      relations: ['items', 'supplier', 'warehouse', 'createdBy'],
    });

    if (!po) {
      throw new NotFoundException(`Orden de compra ${id} no encontrada`);
    }

    return po;
  }

  // ============================================
  // READ BY NUMBER
  // ============================================
  async findByNumber(
    orderNumber: string,
    tenantId: string,
  ): Promise<PurchaseOrder> {
    const po = await this.poRepository.findOne({
      where: { orderNumber, tenantId },
      relations: ['items', 'supplier', 'warehouse'],
    });

    if (!po) {
      throw new NotFoundException(`Orden ${orderNumber} no encontrada`);
    }

    return po;
  }

  // ============================================
  // UPDATE (solo draft)
  // ============================================
  async update(
    id: string,
    dto: UpdatePurchaseOrderDto,
    tenantId: string,
  ): Promise<PurchaseOrder> {
    const po = await this.findOne(id, tenantId);

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden editar órdenes en borrador',
      );
    }

    Object.assign(po, dto);
    return this.poRepository.save(po);
  }

  // ============================================
  // UPDATE STATUS
  // ============================================
  async updateStatus(
    id: string,
    status: PurchaseOrderStatus,
    tenantId: string,
  ): Promise<PurchaseOrder> {
    const po = await this.findOne(id, tenantId);

    const allowedTransitions: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
      [PurchaseOrderStatus.DRAFT]: [
        PurchaseOrderStatus.SENT,
        PurchaseOrderStatus.CANCELLED,
      ],
      [PurchaseOrderStatus.SENT]: [
        PurchaseOrderStatus.CONFIRMED,
        PurchaseOrderStatus.CANCELLED,
      ],
      [PurchaseOrderStatus.CONFIRMED]: [
        PurchaseOrderStatus.PARTIALLY_RECEIVED,
        PurchaseOrderStatus.RECEIVED,
        PurchaseOrderStatus.CANCELLED,
      ],
      [PurchaseOrderStatus.PARTIALLY_RECEIVED]: [
        PurchaseOrderStatus.RECEIVED,
        PurchaseOrderStatus.CANCELLED,
      ],
      [PurchaseOrderStatus.RECEIVED]: [],
      [PurchaseOrderStatus.CANCELLED]: [],
    };

    if (!allowedTransitions[po.status].includes(status)) {
      throw new BadRequestException(
        `No se puede pasar de "${po.status}" a "${status}"`,
      );
    }

    po.status = status;
    return this.poRepository.save(po);
  }

  // ============================================
  // RECEIVE (aumenta stock + movimientos)
  // ============================================
  async receive(
    id: string,
    dto: ReceivePurchaseOrderDto,
    tenantId: string,
    userId?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const po = await manager.findOne(PurchaseOrder, {
        where: { id, tenantId },
        relations: ['items'],
      });

      if (!po) {
        throw new NotFoundException(`Orden ${id} no encontrada`);
      }

      if (
        ![
          PurchaseOrderStatus.SENT,
          PurchaseOrderStatus.CONFIRMED,
          PurchaseOrderStatus.PARTIALLY_RECEIVED,
        ].includes(po.status)
      ) {
        throw new BadRequestException(
          `No se puede recibir una orden en estado "${po.status}"`,
        );
      }

      let allReceived = true;

      for (const receiveItem of dto.items) {
        const item = po.items.find((i) => i.id === receiveItem.itemId);
        if (!item) {
          throw new BadRequestException(
            `Item ${receiveItem.itemId} no pertenece a esta orden`,
          );
        }

        const newReceived = item.quantityReceived + receiveItem.quantityReceived;

        if (newReceived > item.quantity) {
          throw new BadRequestException(
            `Cantidad recibida excede la ordenada para "${item.productName}"`,
          );
        }

        // Actualizar stock
        if (receiveItem.quantityReceived > 0 && item.productId) {
          let stock = await manager.findOne(Stock, {
            where: {
              tenantId,
              warehouseId: po.warehouseId,
              productId: item.productId,
            },
          });

          const stockBefore = stock?.quantity || 0;

          if (!stock) {
            stock = manager.create(Stock, {
              tenantId,
              warehouseId: po.warehouseId,
              productId: item.productId,
              quantity: 0,
              reservedQuantity: 0,
              minStock: 0,
            });
            stock = await manager.save(stock);
          }

          stock.quantity += receiveItem.quantityReceived;
          await manager.save(stock);

          // Crear movimiento
          const movement = manager.create(Movement, {
            tenantId,
            warehouseId: po.warehouseId,
            productId: item.productId,
            userId,
            type: MovementType.PURCHASE,
            quantity: receiveItem.quantityReceived,
            stockBefore,
            stockAfter: stockBefore + receiveItem.quantityReceived,
            referenceType: 'purchase_order',
            referenceId: po.id,
            reason: `Recepción de PO ${po.orderNumber}`,
          });
          await manager.save(movement);
        }

        // Actualizar item
        item.quantityReceived = newReceived;
        await manager.save(item);

        if (newReceived < item.quantity) {
          allReceived = false;
        }
      }

      // Actualizar estado de la orden
      po.status = allReceived
        ? PurchaseOrderStatus.RECEIVED
        : PurchaseOrderStatus.PARTIALLY_RECEIVED;

      if (allReceived) {
        po.receivedDate = new Date();
      }

      await manager.save(po);

      this.logger.log(
        `📦 Recepción PO ${po.orderNumber}: ${allReceived ? 'COMPLETA' : 'PARCIAL'}`,
      );

      return manager.findOne(PurchaseOrder, {
        where: { id: po.id },
        relations: ['items', 'supplier', 'warehouse'],
      });
    });
  }

  // ============================================
  // DELETE (solo draft)
  // ============================================
  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const po = await this.findOne(id, tenantId);

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden eliminar órdenes en borrador',
      );
    }

    await this.poRepository.remove(po);
    return { message: 'Orden de compra eliminada' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId: string) {
    const total = await this.poRepository.count({ where: { tenantId } });

    const byStatus = await this.poRepository
      .createQueryBuilder('po')
      .select('po.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(po.total)', 'total')
      .where('po.tenantId = :tenantId', { tenantId })
      .groupBy('po.status')
      .getRawMany();

    const pendingTotal = await this.poRepository
      .createQueryBuilder('po')
      .select('SUM(po.total)', 'total')
      .where('po.tenantId = :tenantId', { tenantId })
      .andWhere('po.status IN (:...statuses)', {
        statuses: [
          PurchaseOrderStatus.DRAFT,
          PurchaseOrderStatus.SENT,
          PurchaseOrderStatus.CONFIRMED,
          PurchaseOrderStatus.PARTIALLY_RECEIVED,
        ],
      })
      .getRawOne();

    return {
      total,
      byStatus,
      pendingTotal: parseFloat(pendingTotal?.total || 0),
    };
  }
}