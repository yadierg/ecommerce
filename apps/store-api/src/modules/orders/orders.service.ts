// apps/store-api/src/modules/orders/orders.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  Cart,
  Product,
} from '@ecommerce/core';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Cart)
    private readonly cartsRepository: Repository<Cart>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const prefix = `ORD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.ordersRepository.count({
      where: { tenantId },
    });
    const sequence = String(count + 1).padStart(5, '0');

    return `${prefix}-${sequence}`;
  }

  // ============================================
  // CHECKOUT (crear orden desde carrito)
  // ============================================
  async checkout(
    tenantId: string,
    userId: string | null | undefined,
    sessionId: string | null | undefined,
    dto: CreateOrderDto,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Obtener carrito del tenant
      const where: any = { tenantId, status: 'active' };
      if (userId) where.userId = userId;
      else where.sessionId = sessionId;

      const cart = await manager.findOne(Cart, {
        where,
        relations: ['items', 'items.product'],
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestException('El carrito está vacío');
      }

      // 2. Verificar stock
      for (const item of cart.items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId, tenantId },
        });

        if (!product || product.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para "${item.product.name}"`,
          );
        }
      }

      // 3. Calcular totales
      const subtotal = cart.items.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0,
      );
      const tax = subtotal * 0.16;
      const shipping = subtotal >= 50 ? 0 : 5;
      const discount = Number(cart.discount) || 0;
      const total = subtotal + tax + shipping - discount;

      // 4. Crear orden
      const orderNumber = await this.generateOrderNumber(tenantId);

      const order = manager.create(Order, {
        orderNumber,
        tenantId,  // ← IMPORTANTE
        userId: userId || null,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        shippingAddress: dto.shippingAddress,
        paymentMethod: dto.paymentMethod,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        subtotal,
        tax,
        shipping,
        discount,
        total,
        couponCode: dto.couponCode,
        notes: dto.notes,
      });

      const savedOrder = await manager.save(order);

      // 5. Crear order items (snapshot)
      for (const item of cart.items) {
        const orderItem = manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId: item.productId,
          productName: item.product.name,
          productSku: item.product.sku,
          productImage: item.product.mainImage,
          quantity: item.quantity,
          price: Number(item.price),
          subtotal: Number(item.price) * item.quantity,
          options: item.options,
        });

        await manager.save(orderItem);

        // 6. Reducir stock
        await manager.decrement(
          Product,
          { id: item.productId, tenantId },
          'stock',
          item.quantity,
        );

        // 7. Incrementar soldCount
        await manager.increment(
          Product,
          { id: item.productId, tenantId },
          'soldCount',
          item.quantity,
        );
      }

      // 8. Marcar carrito como convertido
      cart.status = 'converted';
      await manager.save(cart);

      // 9. Retornar con items
      return manager.findOne(Order, {
        where: { id: savedOrder.id, tenantId },
        relations: ['items'],
      });
    });
  }

  // ============================================
  // READ ALL (por tenant)
  // ============================================
  async findAll(query: QueryOrderDto, tenantId: string) {
    const { page = 1, limit = 20, status, paymentStatus, search } = query;
    const skip = (page - 1) * limit;

    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.tenantId = :tenantId', { tenantId });

    if (status) qb.andWhere('order.status = :status', { status });
    if (paymentStatus) qb.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus });

    if (search) {
      qb.andWhere(
        '(order.orderNumber ILIKE :search OR order.customerEmail ILIKE :search OR order.customerName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('order.createdAt', 'DESC').skip(skip).take(limit);

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
  // MIS PEDIDOS
  // ============================================
  async findMyOrders(userId: string, tenantId: string) {
    return this.ordersRepository.find({
      where: { userId, tenantId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // READ ONE (validar tenant)
  // ============================================
  async findOne(id: string, tenantId: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, tenantId },
      relations: ['items', 'user'],
    });

    if (!order) {
      throw new NotFoundException(`Orden ${id} no encontrada`);
    }

    return order;
  }

  // ============================================
  // READ BY NUMBER
  // ============================================
  async findByNumber(orderNumber: string, tenantId: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { orderNumber, tenantId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Orden ${orderNumber} no encontrada`);
    }

    return order;
  }

  // ============================================
  // UPDATE STATUS
  // ============================================
  async updateStatus(id: string, status: OrderStatus, tenantId: string): Promise<Order> {
    const order = await this.findOne(id, tenantId);
    order.status = status;

    if (status === OrderStatus.SHIPPED) {
      order.shippedAt = new Date();
    } else if (status === OrderStatus.DELIVERED) {
      order.deliveredAt = new Date();
    } else if (status === OrderStatus.CANCELLED) {
      order.cancelledAt = new Date();

      // Restaurar stock del mismo tenant
      for (const item of order.items) {
        if (item.productId) {
          await this.productsRepository.increment(
            { id: item.productId, tenantId },
            'stock',
            item.quantity,
          );
        }
      }
    }

    return this.ordersRepository.save(order);
  }

  // ============================================
  // UPDATE PAYMENT STATUS
  // ============================================
  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    tenantId: string,
  ): Promise<Order> {
    const order = await this.findOne(id, tenantId);
    order.paymentStatus = paymentStatus;

    if (paymentStatus === PaymentStatus.PAID) {
      order.paidAt = new Date();
      if (order.status === OrderStatus.PENDING) {
        order.status = OrderStatus.PAID;
      }
    }

    return this.ordersRepository.save(order);
  }

  // ============================================
  // CANCEL
  // ============================================
  async cancel(id: string, tenantId: string, reason?: string): Promise<Order> {
    const order = await this.findOne(id, tenantId);

    if (
      [OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(
        order.status,
      )
    ) {
      throw new BadRequestException(
        `No se puede cancelar una orden en estado "${order.status}"`,
      );
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelReason = reason;
    order.cancelledAt = new Date();

    for (const item of order.items) {
      if (item.productId) {
        await this.productsRepository.increment(
          { id: item.productId, tenantId },
          'stock',
          item.quantity,
        );
      }
    }

    return this.ordersRepository.save(order);
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId: string) {
    const total = await this.ordersRepository.count({
      where: { tenantId },
    });

    const byStatus = await this.ordersRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.tenantId = :tenantId', { tenantId })
      .groupBy('order.status')
      .getRawMany();

    const revenue = await this.ordersRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where('order.tenantId = :tenantId', { tenantId })
      .andWhere('order.paymentStatus = :status', { status: PaymentStatus.PAID })
      .getRawOne();

    return {
      total,
      byStatus,
      revenue: parseFloat(revenue?.total || 0),
    };
  }
}