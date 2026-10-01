// apps/store-api/src/modules/orders/orders.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { OrdersService } from './orders.service';
import {
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  Cart,
  Product,
  CartItem,
} from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockOrdersRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockOrderItemsRepository = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockCartsRepository = {
  findOne: jest.fn(),
};

const mockProductsRepository = {
  increment: jest.fn(),
};

const mockManager = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  decrement: jest.fn(),
  increment: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn((cb: (m: any) => any) => cb(mockManager)),
};

// ============================================
// TEST SUITE
// ============================================
describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepository: typeof mockOrdersRepository;
  let orderItemsRepository: typeof mockOrderItemsRepository;
  let cartsRepository: typeof mockCartsRepository;
  let productsRepository: typeof mockProductsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrdersRepository,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemsRepository,
        },
        {
          provide: getRepositoryToken(Cart),
          useValue: mockCartsRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductsRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    ordersRepository = module.get(getRepositoryToken(Order));
    orderItemsRepository = module.get(getRepositoryToken(OrderItem));
    cartsRepository = module.get(getRepositoryToken(Cart));
    productsRepository = module.get(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
    [
      mockOrdersRepository,
      mockOrderItemsRepository,
      mockCartsRepository,
      mockProductsRepository,
    ].forEach((repo) => {
      Object.values(repo).forEach((mock: any) => {
        if (mock?.mockReset) mock.mockReset();
      });
    });
    mockManager.findOne.mockReset();
    mockManager.create.mockReset();
    mockManager.save.mockReset();
    mockManager.decrement.mockReset();
    mockManager.increment.mockReset();
    mockDataSource.transaction.mockImplementation((cb: any) => cb(mockManager));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // HELPERS
  // ============================================
  const mockProduct = (overrides: Partial<Product> = {}): Product =>
    ({
      id: 'prod-1',
      tenantId: 'tenant-1',
      name: 'iPhone',
      slug: 'iphone',
      sku: 'IPH-1',
      price: 999,
      stock: 10,
      mainImage: 'img.jpg',
      isActive: true,
      soldCount: 0,
      ...overrides,
    }) as Product;

  const mockCartItem = (overrides: Partial<CartItem> = {}): CartItem =>
    ({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'prod-1',
        product: mockProduct(),
        quantity: 2,
        price: 999,
        options: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    }) as CartItem;

  const mockCart = (overrides: Partial<Cart> = {}): Cart =>
    ({
      id: 'cart-1',
      tenantId: 'tenant-1',
      userId: null,
      sessionId: 'session-1',
      status: 'active',
      items: [mockCartItem()],
      subtotal: 1998,
      discount: 0,
      ...overrides,
    }) as Cart;

  const mockOrderItem = (overrides: Partial<OrderItem> = {}): OrderItem =>
    ({
      id: 'oi-1',
      orderId: 'order-1',
      productId: 'prod-1',
      productName: 'iPhone',
      productSku: 'IPH-1',
      productImage: 'img.jpg',
      quantity: 2,
      price: 999,
      subtotal: 1998,
      options: null,
      ...overrides,
    }) as OrderItem;

  const mockOrder = (overrides: Partial<Order> = {}): Order =>
    ({
      id: 'order-1',
      orderNumber: 'ORD-202609-00001',
      tenantId: 'tenant-1',
      userId: null,
      customerEmail: 'test@example.com',
      customerName: 'Juan Pérez',
      customerPhone: null,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.CASH,
      shippingAddress: {
        street: 'Calle 1',
        city: 'Madrid',
        state: 'Madrid',
        postalCode: '28001',
        country: 'España',
      },
      subtotal: 1998,
      tax: 319.68,
      shipping: 0,
      discount: 0,
      total: 2317.68,
      couponCode: null,
      items: [mockOrderItem()],
      trackingNumber: null,
      shippedAt: null,
      deliveredAt: null,
      paidAt: null,
      cancelledAt: null,
      cancelReason: null,
      notes: null,
      createdAt: new Date(),
      ...overrides,
    }) as Order;

  const buildQueryBuilder = (data: any[], total?: number) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([data, total ?? data.length]),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(null),
  });

  // ============================================
  // CHECKOUT ⭐
  // ============================================
  describe('checkout', () => {
    const dto = {
      customerName: 'Juan Pérez',
      customerEmail: 'test@example.com',
      shippingAddress: {
        street: 'Calle 1',
        city: 'Madrid',
        state: 'Madrid',
        postalCode: '28001',
        country: 'España',
      },
    };

    const setupCheckout = (cartOverrides: Partial<Cart> = {}) => {
      const cart = mockCart(cartOverrides);
      const product = mockProduct();
      const savedOrder = mockOrder({ id: 'order-1' });

      mockManager.findOne
        .mockResolvedValueOnce(cart) // cart
        .mockResolvedValueOnce(product) // product check
        .mockResolvedValueOnce(savedOrder); // findOne final

      mockManager.create.mockImplementation((_, data) => data);
      mockManager.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'order-1' }),
      );
      mockManager.decrement.mockResolvedValue({ affected: 1 });
      mockManager.increment.mockResolvedValue({ affected: 1 });
      ordersRepository.count.mockResolvedValue(0);

      return { cart, product, savedOrder };
    };

    it('should create order with generated orderNumber', async () => {
      setupCheckout();

      await service.checkout('tenant-1', null, 'session-1', dto);

      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      expect(mockManager.create).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          orderNumber: `ORD-${year}${month}-00001`,
          tenantId: 'tenant-1',
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        }),
      );
    });

    it('should calculate totals correctly (subtotal 1998, tax 16%, shipping free >= 50)', async () => {
      setupCheckout();

      await service.checkout('tenant-1', null, 'session-1', dto);

      // subtotal = 999 * 2 = 1998
      // tax = 1998 * 0.16 = 319.68
      // shipping = 0 (subtotal >= 50)
      // total = 1998 + 319.68 = 2317.68
      expect(mockManager.create).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          subtotal: 1998,
          tax: 319.68,
          shipping: 0,
          total: 2317.68,
        }),
      );
    });

    it('should apply shipping 5 when subtotal < 50', async () => {
      setupCheckout({
        items: [mockCartItem({ price: 20, quantity: 2 })], // subtotal = 40
      });

      await service.checkout('tenant-1', null, 'session-1', dto);

      // subtotal = 40, tax = 6.4, shipping = 5, total = 51.4
      const orderCreateCall = mockManager.create.mock.calls.find(
        (call) => call[0] === Order,
      );
      expect(orderCreateCall![1]).toMatchObject({
        subtotal: 40,
        shipping: 5,
        total: 51.4,
      });
    });

    it('should apply cart discount', async () => {
      setupCheckout({ discount: 100 });

      await service.checkout('tenant-1', null, 'session-1', dto);

      // total = 1998 + 319.68 + 0 - 100 = 2217.68
      expect(mockManager.create).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({ discount: 100, total: 2217.68 }),
      );
    });

    it('should create order items with product snapshot', async () => {
      setupCheckout();

      await service.checkout('tenant-1', null, 'session-1', dto);

      const itemCreateCall = mockManager.create.mock.calls.find(
        (call) => call[0] === OrderItem,
      );
      expect(itemCreateCall![1]).toMatchObject({
        orderId: 'order-1',
        productId: 'prod-1',
        productName: 'iPhone',
        productSku: 'IPH-1',
        productImage: 'img.jpg',
        quantity: 2,
        price: 999,
        subtotal: 1998,
      });
    });

    it('should decrement product stock', async () => {
      setupCheckout();

      await service.checkout('tenant-1', null, 'session-1', dto);

      expect(mockManager.decrement).toHaveBeenCalledWith(
        Product,
        { id: 'prod-1', tenantId: 'tenant-1' },
        'stock',
        2,
      );
    });

    it('should increment product soldCount', async () => {
      setupCheckout();

      await service.checkout('tenant-1', null, 'session-1', dto);

      expect(mockManager.increment).toHaveBeenCalledWith(
        Product,
        { id: 'prod-1', tenantId: 'tenant-1' },
        'soldCount',
        2,
      );
    });

    it('should mark cart as converted', async () => {
      const { cart } = setupCheckout();

      await service.checkout('tenant-1', null, 'session-1', dto);

      expect(cart.status).toBe('converted');
      expect(mockManager.save).toHaveBeenCalledWith(cart);
    });

    it('should use userId in where when provided', async () => {
      setupCheckout();

      await service.checkout('tenant-1', 'user-1', undefined, dto);

      const cartFindCall = mockManager.findOne.mock.calls[0];
      expect(cartFindCall[1].where).toMatchObject({
        tenantId: 'tenant-1',
        status: 'active',
        userId: 'user-1',
      });
    });

    it('should use sessionId in where when no userId', async () => {
      setupCheckout();

      await service.checkout('tenant-1', null, 'session-1', dto);

      const cartFindCall = mockManager.findOne.mock.calls[0];
      expect(cartFindCall[1].where).toMatchObject({
        tenantId: 'tenant-1',
        status: 'active',
        sessionId: 'session-1',
      });
    });

    it('should throw BadRequestException if cart is empty', async () => {
      mockManager.findOne.mockResolvedValueOnce(
        mockCart({ items: [] }),
      );

      await expect(
        service.checkout('tenant-1', null, 'session-1', dto),
      ).rejects.toThrow('El carrito está vacío');
    });

    it('should throw BadRequestException if cart not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.checkout('tenant-1', null, 'session-1', dto),
      ).rejects.toThrow('El carrito está vacío');
    });

    it('should throw BadRequestException if stock insufficient', async () => {
      const cart = mockCart();
      const product = mockProduct({ stock: 1 }); // menos que quantity 2

      mockManager.findOne
        .mockResolvedValueOnce(cart)
        .mockResolvedValueOnce(product);

      await expect(
        service.checkout('tenant-1', null, 'session-1', dto),
      ).rejects.toThrow('Stock insuficiente para "iPhone"');
    });

    it('should throw BadRequestException if product not found during stock check', async () => {
      const cart = mockCart();

      mockManager.findOne
        .mockResolvedValueOnce(cart)
        .mockResolvedValueOnce(null); // product not found

      await expect(
        service.checkout('tenant-1', null, 'session-1', dto),
      ).rejects.toThrow('Stock insuficiente');
    });

    it('should use transaction', async () => {
      setupCheckout();

      await service.checkout('tenant-1', null, 'session-1', dto);

      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should filter by tenantId', async () => {
      const qb = buildQueryBuilder([]);
      ordersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.where).toHaveBeenCalledWith('order.tenantId = :tenantId', {
        tenantId: 'tenant-1',
      });
    });

    it('should apply pagination', async () => {
      const qb = buildQueryBuilder([]);
      ordersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 3, limit: 5 }, 'tenant-1');

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should filter by status and paymentStatus', async () => {
      const qb = buildQueryBuilder([]);
      ordersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        {
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.PAID,
        },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith('order.status = :status', {
        status: OrderStatus.PAID,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'order.paymentStatus = :paymentStatus',
        { paymentStatus: PaymentStatus.PAID },
      );
    });

    it('should apply search on orderNumber, email, name', async () => {
      const qb = buildQueryBuilder([]);
      ordersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'Juan' }, 'tenant-1');

      const searchCall = qb.andWhere.mock.calls.find((call) =>
        call[0].includes('ILIKE'),
      );
      expect(searchCall![0]).toContain('order.orderNumber');
      expect(searchCall![0]).toContain('order.customerEmail');
      expect(searchCall![0]).toContain('order.customerName');
    });

    it('should order by createdAt DESC', async () => {
      const qb = buildQueryBuilder([]);
      ordersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.orderBy).toHaveBeenCalledWith('order.createdAt', 'DESC');
    });

    it('should return paginated response with meta', async () => {
      const qb = buildQueryBuilder([mockOrder()], 42);
      ordersRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 2, limit: 20 }, 'tenant-1');

      expect(result.meta.total).toBe(42);
      expect(result.meta.totalPages).toBe(3);
    });
  });

  // ============================================
  // FIND MY ORDERS
  // ============================================
  describe('findMyOrders', () => {
    it('should return orders of user in tenant', async () => {
      const orders = [mockOrder()];
      ordersRepository.find.mockResolvedValue(orders);

      const result = await service.findMyOrders('user-1', 'tenant-1');

      expect(result).toEqual(orders);
      expect(ordersRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1', tenantId: 'tenant-1' },
        relations: ['items'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array if no orders', async () => {
      ordersRepository.find.mockResolvedValue([]);

      const result = await service.findMyOrders('user-1', 'tenant-1');

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return order with items and user', async () => {
      const order = mockOrder();
      ordersRepository.findOne.mockResolvedValue(order);

      const result = await service.findOne('order-1', 'tenant-1');

      expect(result).toEqual(order);
      expect(ordersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-1', tenantId: 'tenant-1' },
        relations: ['items', 'user'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      ordersRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('order-1', 'tenant-1')).rejects.toThrow(
        'Orden order-1 no encontrada',
      );
    });
  });

  // ============================================
  // FIND BY NUMBER
  // ============================================
  describe('findByNumber', () => {
    it('should return order by number', async () => {
      const order = mockOrder();
      ordersRepository.findOne.mockResolvedValue(order);

      const result = await service.findByNumber('ORD-202609-00001', 'tenant-1');

      expect(result).toEqual(order);
      expect(ordersRepository.findOne).toHaveBeenCalledWith({
        where: { orderNumber: 'ORD-202609-00001', tenantId: 'tenant-1' },
        relations: ['items'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      ordersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByNumber('ORD-999', 'tenant-1'),
      ).rejects.toThrow('Orden ORD-999 no encontrada');
    });
  });

  // ============================================
  // UPDATE STATUS ⭐
  // ============================================
  describe('updateStatus', () => {
    it('should update status to PROCESSING', async () => {
      const order = mockOrder({ status: OrderStatus.PAID });
      ordersRepository.findOne.mockResolvedValue(order);
      ordersRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.updateStatus(
        'order-1',
        OrderStatus.PROCESSING,
        'tenant-1',
      );

      expect(result.status).toBe(OrderStatus.PROCESSING);
    });

    it('should set shippedAt when SHIPPED', async () => {
      const order = mockOrder({ status: OrderStatus.PROCESSING });
      ordersRepository.findOne.mockResolvedValue(order);
      ordersRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.updateStatus(
        'order-1',
        OrderStatus.SHIPPED,
        'tenant-1',
      );

      expect(result.shippedAt).toBeInstanceOf(Date);
    });

    it('should set deliveredAt when DELIVERED', async () => {
      const order = mockOrder({ status: OrderStatus.SHIPPED });
      ordersRepository.findOne.mockResolvedValue(order);
      ordersRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.updateStatus(
        'order-1',
        OrderStatus.DELIVERED,
        'tenant-1',
      );

      expect(result.deliveredAt).toBeInstanceOf(Date);
    });

    it('should restore stock when CANCELLED', async () => {
      const order = mockOrder({ status: OrderStatus.PAID });
      ordersRepository.findOne.mockResolvedValue(order);
      ordersRepository.save.mockImplementation((data) => Promise.resolve(data));
      productsRepository.increment.mockResolvedValue({ affected: 1 });

      await service.updateStatus(
        'order-1',
        OrderStatus.CANCELLED,
        'tenant-1',
      );

      expect(productsRepository.increment).toHaveBeenCalledWith(
        { id: 'prod-1', tenantId: 'tenant-1' },
        'stock',
        2,
      );
    });

    it('should skip increment for items without productId', async () => {
      const order = mockOrder({
        status: OrderStatus.PAID,
        items: [mockOrderItem({ productId: undefined })],
      });
      ordersRepository.findOne.mockResolvedValue(order);
      ordersRepository.save.mockImplementation((data) => Promise.resolve(data));

      await service.updateStatus(
        'order-1',
        OrderStatus.CANCELLED,
        'tenant-1',
      );

      expect(productsRepository.increment).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found', async () => {
      ordersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus('order-1', OrderStatus.SHIPPED, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // UPDATE PAYMENT STATUS ⭐
  // ============================================
  describe('updatePaymentStatus', () => {
    it('should set paidAt when PAID', async () => {
      const order = mockOrder({ status: OrderStatus.PENDING });
      ordersRepository.findOne.mockResolvedValue(order);
      ordersRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.updatePaymentStatus(
        'order-1',
        PaymentStatus.PAID,
        'tenant-1',
      );

      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(result.paidAt).toBeInstanceOf(Date);
    });

    it('should auto-update status PENDING → PAID when payment PAID', async () => {
      const order = mockOrder({ status: OrderStatus.PENDING });
      ordersRepository.findOne.mockResolvedValue(order);
      ordersRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.updatePaymentStatus(
        'order-1',
        PaymentStatus.PAID,
        'tenant-1',
      );

      expect(result.status).toBe(OrderStatus.PAID);
    });

    it('should NOT change status if already PAID', async () => {
      const order = mockOrder({ status: OrderStatus.SHIPPED });
      ordersRepository.findOne.mockResolvedValue(order);
      ordersRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.updatePaymentStatus(
        'order-1',
        PaymentStatus.PAID,
        'tenant-1',
      );

      expect(result.status).toBe(OrderStatus.SHIPPED); // sin cambios
    });

    it('should set paymentStatus FAILED without changing order status', async () => {
      const order = mockOrder({ status: OrderStatus.PENDING });
      ordersRepository.findOne.mockResolvedValue(order);
      ordersRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.updatePaymentStatus(
        'order-1',
        PaymentStatus.FAILED,
        'tenant-1',
      );

      expect(result.paymentStatus).toBe(PaymentStatus.FAILED);
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.paidAt).toBeNull();
    });
  });

  // ============================================
  // CANCEL
  // ============================================
  describe('cancel', () => {
    it('should cancel PENDING order and restore stock', async () => {
      const order = mockOrder({ status: OrderStatus.PENDING });
      ordersRepository.findOne.mockResolvedValue(order);
      ordersRepository.save.mockImplementation((data) => Promise.resolve(data));
      productsRepository.increment.mockResolvedValue({ affected: 1 });

      const result = await service.cancel(
        'order-1',
        'tenant-1',
        'Cliente solicitó cancelación',
      );

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.cancelReason).toBe('Cliente solicitó cancelación');
      expect(result.cancelledAt).toBeInstanceOf(Date);
      expect(productsRepository.increment).toHaveBeenCalled();
    });

    it('should cancel PAID order', async () => {
      const order = mockOrder({ status: OrderStatus.PAID });
      ordersRepository.findOne.mockResolvedValue(order);
      ordersRepository.save.mockImplementation((data) => Promise.resolve(data));
      productsRepository.increment.mockResolvedValue({ affected: 1 });

      const result = await service.cancel('order-1', 'tenant-1');

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw BadRequestException if SHIPPED', async () => {
      ordersRepository.findOne.mockResolvedValue(
        mockOrder({ status: OrderStatus.SHIPPED }),
      );

      await expect(service.cancel('order-1', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if DELIVERED', async () => {
      ordersRepository.findOne.mockResolvedValue(
        mockOrder({ status: OrderStatus.DELIVERED }),
      );

      await expect(service.cancel('order-1', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if already CANCELLED', async () => {
      ordersRepository.findOne.mockResolvedValue(
        mockOrder({ status: OrderStatus.CANCELLED }),
      );

      await expect(service.cancel('order-1', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not restore stock if status invalid', async () => {
      ordersRepository.findOne.mockResolvedValue(
        mockOrder({ status: OrderStatus.SHIPPED }),
      );

      await expect(
        service.cancel('order-1', 'tenant-1'),
      ).rejects.toThrow();

      expect(productsRepository.increment).not.toHaveBeenCalled();
    });

    it('should skip stock restore for items without productId', async () => {
      const order = mockOrder({
        status: OrderStatus.PENDING,
        items: [mockOrderItem({ productId: undefined })],
      });
      ordersRepository.findOne.mockResolvedValue(order);
      ordersRepository.save.mockImplementation((data) => Promise.resolve(data));

      await service.cancel('order-1', 'tenant-1');

      expect(productsRepository.increment).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return total, byStatus, revenue', async () => {
      ordersRepository.count.mockResolvedValue(100);

      const byStatusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'pending', count: '10' },
          { status: 'paid', count: '50' },
          { status: 'shipped', count: '40' },
        ]),
      };

      const revenueQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '50000.50' }),
      };

      ordersRepository.createQueryBuilder
        .mockReturnValueOnce(byStatusQb)
        .mockReturnValueOnce(revenueQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(100);
      expect(result.byStatus).toHaveLength(3);
      expect(result.revenue).toBe(50000.5);
    });

    it('should only count PAID revenue', async () => {
      ordersRepository.count.mockResolvedValue(0);

      const byStatusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      const revenueQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      };

      ordersRepository.createQueryBuilder
        .mockReturnValueOnce(byStatusQb)
        .mockReturnValueOnce(revenueQb);

      await service.getStats('tenant-1');

      expect(revenueQb.andWhere).toHaveBeenCalledWith(
        'order.paymentStatus = :status',
        { status: PaymentStatus.PAID },
      );
    });

    it('should return zeros when no orders', async () => {
      ordersRepository.count.mockResolvedValue(0);

      const emptyQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue(null),
      };
      ordersRepository.createQueryBuilder.mockReturnValue(emptyQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(0);
      expect(result.revenue).toBe(0);
    });
  });
});