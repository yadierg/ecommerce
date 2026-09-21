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

  // ============================================
  // GENERAR NÚMERO DE ORDEN
  // ============================================
  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const prefix = `ORD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.ordersRepository.count();
    const sequence = String(count + 1).padStart(5, '0');

    return `${prefix}-${sequence}`;
  }

  // ============================================
  // CHECKOUT (crear orden desde carrito)
  // ============================================
  async checkout(
    userId: string | undefined,
    sessionId: string | undefined,
    dto: CreateOrderDto,
  ): Promise<Order> {
    // Transacción para consistencia
    return this.dataSource.transaction(async (manager) => {
      // 1. Obtener carrito
      const cart = await manager.findOne(Cart, {
        where: userId
          ? { userId, status: 'active' }
          : { sessionId, status: 'active' },
        relations: ['items', 'items.product'],
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestException('El carrito está vacío');
      }

      // 2. Verificar stock de todos los items
      for (const item of cart.items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
        });

        if (!product || product.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para "${item.product.name}"`,
          );
        }
      }

      // 3. Calcular totales
      const subtotal = cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const tax = subtotal * 0.16; // 16% de impuesto
      const shipping = subtotal >= 50 ? 0 : 5; // Envío gratis desde $50
      const discount = cart.discount || 0;
      const total = subtotal + tax + shipping - discount;

      // 4. Crear orden
      const orderNumber = await this.generateOrderNumber();

      const order = manager.create(Order, {
        orderNumber,
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
          price: item.price,
          subtotal: item.price * item.quantity,
          options: item.options,
        });

        await manager.save(orderItem);

        // 6. Reducir stock
        await manager.decrement(
          Product,
          { id: item.productId },
          'stock',
          item.quantity,
        );

        // 7. Aumentar soldCount
        await manager.increment(
          Product,
          { id: item.productId },
          'soldCount',
          item.quantity,
        );
      }

      // 8. Marcar carrito como convertido
      cart.status = 'converted';
      await manager.save(cart);

      // 9. Retornar orden con items
      return manager.findOne(Order, {
        where: { id: savedOrder.id },
        relations: ['items'],
      });
    });
  }

  // ============================================
  // READ ALL (con filtros)
  // ============================================
  async findAll(query: QueryOrderDto) {
    const { page = 1, limit = 20, status, paymentStatus, search } = query;
    const skip = (page - 1) * limit;

    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items');

    if (status) qb.andWhere('order.status = :status', { status });
    if (paymentStatus)
      qb.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus });

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
  async findMyOrders(userId: string) {
    return this.ordersRepository.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // READ ONE
  // ============================================
  async findOne(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
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
  async findByNumber(orderNumber: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { orderNumber },
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
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.findOne(id);
    order.status = status;

    if (status === OrderStatus.SHIPPED) {
      order.shippedAt = new Date();
    } else if (status === OrderStatus.DELIVERED) {
      order.deliveredAt = new Date();
    } else if (status === OrderStatus.CANCELLED) {
      order.cancelledAt = new Date();
      // Restaurar stock
      for (const item of order.items) {
        if (item.productId) {
          await this.productsRepository.increment(
            { id: item.productId },
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
  ): Promise<Order> {
    const order = await this.findOne(id);
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
  async cancel(id: string, reason?: string): Promise<Order> {
    const order = await this.findOne(id);

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

    // Restaurar stock
    for (const item of order.items) {
      if (item.productId) {
        await this.productsRepository.increment(
          { id: item.productId },
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
  async getStats() {
    const total = await this.ordersRepository.count();

    const byStatus = await this.ordersRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany();

    const revenue = await this.ordersRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where('order.paymentStatus = :status', { status: PaymentStatus.PAID })
      .getRawOne();

    return {
      total,
      byStatus,
      revenue: parseFloat(revenue?.total || 0),
    };
  }
}