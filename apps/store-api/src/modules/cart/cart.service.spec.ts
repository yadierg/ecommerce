// apps/store-api/src/modules/cart/cart.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { CartService } from './cart.service';
import { Cart, CartItem, Product } from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockCartsRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockCartItemsRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
};

const mockProductsRepository = {
  findOne: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('CartService', () => {
  let service: CartService;
  let cartsRepository: typeof mockCartsRepository;
  let cartItemsRepository: typeof mockCartItemsRepository;
  let productsRepository: typeof mockProductsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: getRepositoryToken(Cart),
          useValue: mockCartsRepository,
        },
        {
          provide: getRepositoryToken(CartItem),
          useValue: mockCartItemsRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductsRepository,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    cartsRepository = module.get(getRepositoryToken(Cart));
    cartItemsRepository = module.get(getRepositoryToken(CartItem));
    productsRepository = module.get(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
    [
      mockCartsRepository,
      mockCartItemsRepository,
      mockProductsRepository,
    ].forEach((repo) => {
      Object.values(repo).forEach((mock: any) => {
        if (mock?.mockReset) mock.mockReset();
      });
    });
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
      isActive: true,
      ...overrides,
    }) as Product;

  const mockCartItem = (overrides: Partial<CartItem> = {}): CartItem =>
    ({
      id: 'item-1',
      cartId: 'cart-1',
      productId: 'prod-1',
      product: mockProduct(),
      quantity: 1,
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
      items: [],
      subtotal: 0,
      couponCode: null,
      discount: 0,
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Cart;

  // ============================================
  // GET OR CREATE CART
  // ============================================
  describe('getOrCreateCart', () => {
    it('should throw BadRequestException if no userId nor sessionId', async () => {
      await expect(
        service.getOrCreateCart('tenant-1'),
      ).rejects.toThrow('Se requiere userId o sessionId para el carrito');
    });

    it('should find existing cart by userId', async () => {
      const cart = mockCart({ userId: 'user-1', sessionId: null });
      cartsRepository.findOne.mockResolvedValue(cart);

      const result = await service.getOrCreateCart('tenant-1', 'user-1');

      expect(result).toEqual(cart);
      expect(cartsRepository.findOne).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', status: 'active', userId: 'user-1' },
        relations: ['items', 'items.product'],
      });
    });

    it('should find existing cart by sessionId when no userId', async () => {
      const cart = mockCart();
      cartsRepository.findOne.mockResolvedValue(cart);

      const result = await service.getOrCreateCart(
        'tenant-1',
        undefined,
        'session-1',
      );

      expect(result).toEqual(cart);
      expect(cartsRepository.findOne).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          status: 'active',
          sessionId: 'session-1',
        },
        relations: ['items', 'items.product'],
      });
    });

    it('should create new cart when not found', async () => {
      cartsRepository.findOne.mockResolvedValue(null);
      cartsRepository.create.mockImplementation((data) => data);
      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'cart-1' }),
      );

      const result = await service.getOrCreateCart('tenant-1', 'user-1');

      expect(cartsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'user-1',
          sessionId: null,
          status: 'active',
          items: [],
        }),
      );
      expect(result.id).toBe('cart-1');
    });

    it('should prioritize userId over sessionId', async () => {
      cartsRepository.findOne.mockResolvedValue(mockCart({ userId: 'user-1' }));

      await service.getOrCreateCart('tenant-1', 'user-1', 'session-1');

      const call = cartsRepository.findOne.mock.calls[0][0];
      expect(call.where.userId).toBe('user-1');
      expect(call.where.sessionId).toBeUndefined();
    });
  });

  // ============================================
  // ADD ITEM
  // ============================================
  describe('addItem', () => {
    const validDto = { productId: 'prod-1', quantity: 2 };

    const setupAddItem = (cartOverrides = {}) => {
      const cart = mockCart({ items: [], ...cartOverrides });
      cartsRepository.findOne
        .mockResolvedValueOnce(cart) // getOrCreateCart
        .mockResolvedValueOnce(cart); // recalculate findOne
      productsRepository.findOne.mockResolvedValue(mockProduct({ stock: 10 }));
      cartItemsRepository.create.mockImplementation((data) => data);
      cartItemsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'item-1' }),
      );
      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      return cart;
    };

    it('should add new item to empty cart', async () => {
      setupAddItem();

      await service.addItem('tenant-1', null, 'session-1', validDto);

      expect(cartItemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cartId: 'cart-1',
          productId: 'prod-1',
          quantity: 2,
          price: 999,
        }),
      );
    });

    it('should default quantity to 1', async () => {
      setupAddItem();

      await service.addItem('tenant-1', null, 'session-1', {
        productId: 'prod-1',
      });

      expect(cartItemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 1 }),
      );
    });

    it('should increment existing item quantity', async () => {
      const existingItem = mockCartItem({ quantity: 3 });
      const cart = mockCart({ items: [existingItem] });
      cartsRepository.findOne
        .mockResolvedValueOnce(cart)
        .mockResolvedValueOnce(cart);
      productsRepository.findOne.mockResolvedValue(mockProduct({ stock: 10 }));
      cartItemsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.addItem('tenant-1', null, 'session-1', validDto);

      expect(existingItem.quantity).toBe(5); // 3 + 2
      expect(cartItemsRepository.save).toHaveBeenCalledWith(existingItem);
    });

    it('should validate product belongs to tenant and is active', async () => {
      setupAddItem();

      await service.addItem('tenant-1', null, 'session-1', validDto);

      expect(productsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'prod-1', tenantId: 'tenant-1', isActive: true },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      cartsRepository.findOne.mockResolvedValue(mockCart());
      productsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addItem('tenant-1', null, 'session-1', validDto),
      ).rejects.toThrow('Producto no encontrado en tu empresa');
    });

    it('should throw BadRequestException if stock insufficient for new item', async () => {
      cartsRepository.findOne.mockResolvedValue(mockCart({ items: [] }));
      productsRepository.findOne.mockResolvedValue(mockProduct({ stock: 1 }));

      await expect(
        service.addItem('tenant-1', null, 'session-1', {
          productId: 'prod-1',
          quantity: 5,
        }),
      ).rejects.toThrow('Stock insuficiente');
    });

    it('should throw BadRequestException if stock insufficient for existing item', async () => {
      const existingItem = mockCartItem({ quantity: 3 });
      const cart = mockCart({ items: [existingItem] });
      cartsRepository.findOne.mockResolvedValue(cart);
      productsRepository.findOne.mockResolvedValue(mockProduct({ stock: 4 }));

      await expect(
        service.addItem('tenant-1', null, 'session-1', {
          productId: 'prod-1',
          quantity: 2, // 3 + 2 = 5 > 4
        }),
      ).rejects.toThrow('Stock insuficiente');
    });

    it('should recalculate subtotal after add', async () => {
      const cart = setupAddItem();
      // Simulamos que recalculate llama a findOne y retorna cart con items
      const cartWithItems = mockCart({
        items: [mockCartItem({ quantity: 2, price: 999 })],
      });
      cartsRepository.findOne
        .mockReset()
        .mockResolvedValueOnce(cart)
        .mockResolvedValueOnce(cartWithItems);

      await service.addItem('tenant-1', null, 'session-1', validDto);

      expect(cartsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ subtotal: 1998 }),
      );
    });
  });

  // ============================================
  // UPDATE ITEM
  // ============================================
  describe('updateItem', () => {
    it('should update item quantity', async () => {
      const item = mockCartItem({ quantity: 2 });
      const itemWithCart = { ...item, cart: mockCart() };
      cartItemsRepository.findOne.mockResolvedValue(itemWithCart);
      cartItemsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      cartsRepository.findOne.mockResolvedValue(
        mockCart({ items: [item] }),
      );
      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.updateItem('cart-1', 'item-1', { quantity: 5 }, 'tenant-1');

      // ✅ Verificar sobre itemWithCart (el que realmente mutó el service)
      expect(itemWithCart.quantity).toBe(5);
    });

    it('should remove item when quantity is 0', async () => {
      const item = mockCartItem({ quantity: 2 });
      const itemWithCart = { ...item, cart: mockCart() };
      cartItemsRepository.findOne.mockResolvedValue(itemWithCart);
      cartsRepository.findOne.mockResolvedValue(mockCart({ items: [] }));
      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.updateItem('cart-1', 'item-1', { quantity: 0 }, 'tenant-1');

      expect(cartItemsRepository.remove).toHaveBeenCalledWith(itemWithCart);
    });

    it('should throw BadRequestException if stock insufficient', async () => {
      const item = mockCartItem();
      const itemWithCart = {
        ...item,
        product: mockProduct({ stock: 3 }),
        cart: mockCart(),
      };
      cartItemsRepository.findOne.mockResolvedValue(itemWithCart);

      await expect(
        service.updateItem('cart-1', 'item-1', { quantity: 10 }, 'tenant-1'),
      ).rejects.toThrow('Stock insuficiente');
    });

    it('should throw NotFoundException if item not found', async () => {
      cartItemsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateItem('cart-1', 'item-1', { quantity: 5 }, 'tenant-1'),
      ).rejects.toThrow('Item no encontrado');
    });

    it('should throw NotFoundException if cart belongs to other tenant', async () => {
      const item = mockCartItem();
      const itemWithCart = {
        ...item,
        cart: mockCart({ tenantId: 'other-tenant' }),
      };
      cartItemsRepository.findOne.mockResolvedValue(itemWithCart);

      await expect(
        service.updateItem('cart-1', 'item-1', { quantity: 5 }, 'tenant-1'),
      ).rejects.toThrow('Item no encontrado');
    });
  });

  // ============================================
  // REMOVE ITEM
  // ============================================
  describe('removeItem', () => {
    it('should remove item and recalculate', async () => {
      const item = mockCartItem();
      const itemWithCart = { ...item, cart: mockCart() };
      cartItemsRepository.findOne.mockResolvedValue(itemWithCart);
      cartItemsRepository.remove.mockResolvedValue(itemWithCart);
      cartsRepository.findOne.mockResolvedValue(mockCart({ items: [] }));
      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.removeItem('cart-1', 'item-1', 'tenant-1');

      expect(cartItemsRepository.remove).toHaveBeenCalledWith(itemWithCart);
    });

    it('should throw NotFoundException if item not found', async () => {
      cartItemsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeItem('cart-1', 'item-1', 'tenant-1'),
      ).rejects.toThrow('Item no encontrado');
    });

    it('should throw NotFoundException if cart belongs to other tenant', async () => {
      const item = mockCartItem();
      cartItemsRepository.findOne.mockResolvedValue({
        ...item,
        cart: mockCart({ tenantId: 'other' }),
      });

      await expect(
        service.removeItem('cart-1', 'item-1', 'tenant-1'),
      ).rejects.toThrow('Item no encontrado');
    });
  });

  // ============================================
  // CLEAR CART
  // ============================================
  describe('clearCart', () => {
    it('should delete all items and recalculate', async () => {
      const cart = mockCart({ items: [mockCartItem()] });
      cartsRepository.findOne
        .mockResolvedValueOnce(cart) // findOne inicial
        .mockResolvedValueOnce(mockCart({ items: [] })); // recalculate
      cartItemsRepository.delete.mockResolvedValue({ affected: 1 });
      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.clearCart('cart-1', 'tenant-1');

      expect(cartItemsRepository.delete).toHaveBeenCalledWith({
        cartId: 'cart-1',
      });
    });

    it('should throw NotFoundException if cart not found', async () => {
      cartsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.clearCart('cart-1', 'tenant-1'),
      ).rejects.toThrow('Carrito no encontrado');
    });
  });

  // ============================================
  // GET CART
  // ============================================
  describe('getCart', () => {
    it('should get or create cart and recalculate', async () => {
      const cart = mockCart();
      cartsRepository.findOne
        .mockResolvedValueOnce(cart) // getOrCreateCart
        .mockResolvedValueOnce(cart); // recalculate
      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.getCart('tenant-1', null, 'session-1');

      expect(result).toEqual(cart);
      expect(cartsRepository.save).toHaveBeenCalled();
    });
  });

  // ============================================
  // RECALCULATE (subtotal)
  // ============================================
  describe('recalculate (via addItem)', () => {
    it('should compute subtotal as sum(price * quantity)', async () => {
      // ✅ Productos DISTINTOS para que addItem NO matchee con los existentes
      const items = [
        mockCartItem({
          id: 'i1',
          productId: 'existing-prod-1',
          price: 100,
          quantity: 2,
        }),
        mockCartItem({
          id: 'i2',
          productId: 'existing-prod-2',
          price: 50,
          quantity: 3,
        }),
      ];
      const cart = mockCart({ items });
      cartsRepository.findOne
        .mockResolvedValueOnce(cart) // getOrCreateCart
        .mockResolvedValueOnce(cart); // recalculate

      // El producto nuevo NO matchea con los existentes
      productsRepository.findOne.mockResolvedValue(
        mockProduct({ id: 'new-prod-999' }),
      );
      cartItemsRepository.create.mockImplementation((data) => data);
      cartItemsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.addItem('tenant-1', null, 'session-1', {
        productId: 'new-prod-999',
      });

      // i1: 100 × 2 = 200
      // i2: 50 × 3 = 150
      // Total: 350
      expect(cartsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ subtotal: 350 }),
      );
    });

    it('should handle string prices (Number() conversion)', async () => {
      const items = [
        mockCartItem({
          id: 'i1',
          productId: 'existing-prod-1',
          price: '99.99' as any,
          quantity: 2,
        }),
      ];
      const cart = mockCart({ items });
      cartsRepository.findOne
        .mockResolvedValueOnce(cart)
        .mockResolvedValueOnce(cart);
      // ✅ Producto nuevo distinto para evitar matcheo
      productsRepository.findOne.mockResolvedValue(
        mockProduct({ id: 'new-prod-999' }),
      );
      cartItemsRepository.create.mockImplementation((data) => data);
      cartItemsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.addItem('tenant-1', null, 'session-1', {
        productId: 'new-prod-999',
      });

      const saveCall = cartsRepository.save.mock.calls[0][0];
      expect(saveCall.subtotal).toBeCloseTo(199.98, 2);
      expect(typeof saveCall.subtotal).toBe('number');
    });

    it('should return 0 subtotal for empty cart', async () => {
      const cart = mockCart({ items: [] });
      cartsRepository.findOne
        .mockResolvedValueOnce(cart)
        .mockResolvedValueOnce(cart);
      productsRepository.findOne.mockResolvedValue(mockProduct());
      cartItemsRepository.create.mockImplementation((data) => data);
      cartItemsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.addItem('tenant-1', null, 'session-1', {
        productId: 'prod-1',
      });

      expect(cartsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ subtotal: 0 }),
      );
    });
  });

  // ============================================
  // MERGE CARTS (guest → user)
  // ============================================
  describe('mergeCarts', () => {
    it('should return user cart when no guest cart', async () => {
      cartsRepository.findOne
        .mockResolvedValueOnce(null) // guestCart not found
        .mockResolvedValueOnce(null); // getOrCreateCart findOne
      cartsRepository.create.mockImplementation((data) => data);
      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'user-cart' }),
      );

      await service.mergeCarts('tenant-1', 'session-1', 'user-1');

      // Debe crear carrito de usuario
      expect(cartsRepository.create).toHaveBeenCalled();
    });

    it('should merge items from guest cart into user cart', async () => {
      const guestItem = mockCartItem({ id: 'guest-item', productId: 'prod-1' });
      const guestCart = mockCart({
        id: 'guest-cart',
        sessionId: 'session-1',
        items: [guestItem],
      });
      const userCart = mockCart({
        id: 'user-cart',
        userId: 'user-1',
        sessionId: null,
        items: [],
      });

      cartsRepository.findOne
        .mockResolvedValueOnce(guestCart) // guestCart
        .mockResolvedValueOnce(userCart) // getOrCreateCart
        .mockResolvedValueOnce(userCart); // recalculate

      cartItemsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.mergeCarts('tenant-1', 'session-1', 'user-1');

      // El item del guest debe cambiar de cartId
      expect(guestItem.cartId).toBe('user-cart');
    });

    it('should combine quantities for duplicate products', async () => {
      const guestItem = mockCartItem({
        id: 'guest-item',
        productId: 'prod-1',
        quantity: 2,
      });
      const userItem = mockCartItem({
        id: 'user-item',
        productId: 'prod-1',
        quantity: 3,
      });
      const guestCart = mockCart({
        id: 'guest-cart',
        sessionId: 'session-1',
        items: [guestItem],
      });
      const userCart = mockCart({
        id: 'user-cart',
        userId: 'user-1',
        items: [userItem],
      });

      cartsRepository.findOne
        .mockResolvedValueOnce(guestCart)
        .mockResolvedValueOnce(userCart)
        .mockResolvedValueOnce(userCart);

      cartItemsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.mergeCarts('tenant-1', 'session-1', 'user-1');

      expect(userItem.quantity).toBe(5); // 3 + 2
    });

    it('should mark guest cart as converted', async () => {
      const guestCart = mockCart({
        id: 'guest-cart',
        sessionId: 'session-1',
        items: [],
      });
      const userCart = mockCart({ id: 'user-cart', userId: 'user-1' });

      cartsRepository.findOne
        .mockResolvedValueOnce(guestCart)
        .mockResolvedValueOnce(userCart)
        .mockResolvedValueOnce(userCart);

      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.mergeCarts('tenant-1', 'session-1', 'user-1');

      expect(guestCart.status).toBe('converted');
      expect(cartsRepository.save).toHaveBeenCalledWith(guestCart);
    });

    it('should recalculate user cart after merge', async () => {
      const guestItem = mockCartItem({
        productId: 'prod-1',
        price: 100,
        quantity: 2,
      });
      const guestCart = mockCart({
        id: 'guest-cart',
        sessionId: 'session-1',
        items: [guestItem],
      });
      const userCart = mockCart({
        id: 'user-cart',
        userId: 'user-1',
        items: [],
      });

      cartsRepository.findOne
        .mockResolvedValueOnce(guestCart)
        .mockResolvedValueOnce(userCart)
        .mockResolvedValueOnce(userCart);

      cartItemsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      cartsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.mergeCarts('tenant-1', 'session-1', 'user-1');

      // El último save es de recalculate con subtotal
      const recalcSave = cartsRepository.save.mock.calls.find(
        (call) => call[0].subtotal !== undefined,
      );
      expect(recalcSave).toBeDefined();
    });
  });
});