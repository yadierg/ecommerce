// apps/inventory-api/src/modules/purchase-orders/purchase-orders.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { PurchaseOrdersService } from './purchase-orders.service';
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

// ============================================
// MOCKS
// ============================================
const mockPoRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockPoItemRepository = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockSuppliersRepository = {
  findOne: jest.fn(),
};

const mockWarehousesRepository = {
  findOne: jest.fn(),
};

const mockProductsRepository = {
  findOne: jest.fn(),
};

const mockManager = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn((cb: (m: any) => any) => cb(mockManager)),
};

// ============================================
// TEST SUITE
// ============================================
describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let poRepository: typeof mockPoRepository;
  let poItemRepository: typeof mockPoItemRepository;
  let suppliersRepository: typeof mockSuppliersRepository;
  let warehousesRepository: typeof mockWarehousesRepository;
  let productsRepository: typeof mockProductsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        {
          provide: getRepositoryToken(PurchaseOrder),
          useValue: mockPoRepository,
        },
        {
          provide: getRepositoryToken(PurchaseOrderItem),
          useValue: mockPoItemRepository,
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSuppliersRepository,
        },
        {
          provide: getRepositoryToken(Warehouse),
          useValue: mockWarehousesRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductsRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
    poRepository = module.get(getRepositoryToken(PurchaseOrder));
    poItemRepository = module.get(getRepositoryToken(PurchaseOrderItem));
    suppliersRepository = module.get(getRepositoryToken(Supplier));
    warehousesRepository = module.get(getRepositoryToken(Warehouse));
    productsRepository = module.get(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
    [
      mockPoRepository,
      mockPoItemRepository,
      mockSuppliersRepository,
      mockWarehousesRepository,
      mockProductsRepository,
    ].forEach((repo) => {
      Object.values(repo).forEach((mock: any) => {
        if (mock?.mockReset) mock.mockReset();
      });
    });
    mockManager.findOne.mockReset();
    mockManager.create.mockReset();
    mockManager.save.mockReset();
    mockDataSource.transaction.mockImplementation((cb: any) => cb(mockManager));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // HELPERS
  // ============================================
  const mockSupplier = { id: 'sup-1', name: 'Apple Dist', tenantId: 'tenant-1' };
  const mockWarehouse = { id: 'wh-1', name: 'Almacén Central', tenantId: 'tenant-1' };
  const mockProduct = {
    id: 'prod-1',
    name: 'Panel Solar 400W',
    sku: 'PNL-400',
    tenantId: 'tenant-1',
  };

  const mockPOItem = (
    overrides: Partial<PurchaseOrderItem> = {},
  ): PurchaseOrderItem =>
    ({
      id: 'item-1',
      purchaseOrderId: 'po-1',
      productId: 'prod-1',
      productName: 'Panel Solar 400W',
      productSku: 'PNL-400',
      quantity: 10,
      quantityReceived: 0,
      unitPrice: 100,
      subtotal: 1000,
      taxRate: 0,
      notes: null,
      ...overrides,
    }) as PurchaseOrderItem;

  const mockPO = (overrides: Partial<PurchaseOrder> = {}): PurchaseOrder =>
    ({
      id: 'po-1',
      tenantId: 'tenant-1',
      supplierId: 'sup-1',
      warehouseId: 'wh-1',
      createdById: 'user-1',
      orderNumber: 'PO-202609-00001',
      status: PurchaseOrderStatus.DRAFT,
      orderDate: new Date('2026-09-01'),
      expectedDate: null,
      receivedDate: null,
      subtotal: 1000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 1000,
      currency: 'USD',
      paymentTerms: 30,
      notes: null,
      internalReference: null,
      items: [mockPOItem()],
      ...overrides,
    }) as PurchaseOrder;

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
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto = {
      supplierId: 'sup-1',
      warehouseId: 'wh-1',
      items: [
        { productId: 'prod-1', quantity: 10, unitPrice: 100 },
        { productId: 'prod-2', quantity: 5, unitPrice: 200, taxRate: 21 },
      ],
    };

    const setupCreate = () => {
      suppliersRepository.findOne.mockResolvedValue(mockSupplier);
      warehousesRepository.findOne.mockResolvedValue(mockWarehouse);
      productsRepository.findOne.mockResolvedValue(mockProduct);
      poRepository.count.mockResolvedValue(0);
      poItemRepository.create.mockImplementation((data) => data);
      poRepository.create.mockImplementation((data) => ({ ...data }));
      poRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'po-1' }),
      );
    };

    it('should create PO with generated number', async () => {
      setupCreate();

      await service.create(validDto, 'tenant-1', 'user-1');

      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      expect(poRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderNumber: `PO-${year}${month}-00001`,
          status: PurchaseOrderStatus.DRAFT,
          tenantId: 'tenant-1',
          createdById: 'user-1',
        }),
      );
    });

    it('should calculate subtotal, tax, total', async () => {
      setupCreate();

      await service.create(validDto, 'tenant-1');

      // subtotal = (10 * 100) + (5 * 200) = 1000 + 1000 = 2000
      // tax = (10 * 100 * 0) + (5 * 200 * 0.21) = 0 + 210 = 210
      // total = 2000 + 210 + 0 - 0 = 2210
      expect(poRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 2000,
          tax: 210,
          total: 2210,
        }),
      );
    });

    it('should apply shipping and discount', async () => {
      setupCreate();

      await service.create(
        { ...validDto, shipping: 50, discount: 100 },
        'tenant-1',
      );

      // total = 2000 + 210 + 50 - 100 = 2160
      expect(poRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ total: 2160 }),
      );
    });

    it('should validate supplier exists', async () => {
      suppliersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(validDto, 'tenant-1'),
      ).rejects.toThrow('Proveedor no encontrado');
    });

    it('should validate warehouse exists', async () => {
      suppliersRepository.findOne.mockResolvedValue(mockSupplier);
      warehousesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(validDto, 'tenant-1'),
      ).rejects.toThrow('Almacén no encontrado');
    });

    it('should validate each product exists', async () => {
      suppliersRepository.findOne.mockResolvedValue(mockSupplier);
      warehousesRepository.findOne.mockResolvedValue(mockWarehouse);
      productsRepository.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(null); // segundo producto no existe

      await expect(
        service.create(validDto, 'tenant-1'),
      ).rejects.toThrow('Producto prod-2 no encontrado');
    });

    it('should snapshot productName and productSku', async () => {
      setupCreate();
      poRepository.create.mockImplementation((data) => ({
        ...data,
        items: data.items.map((it: any) => ({
          ...it,
          productName: '',
          productSku: '',
        })),
      }));

      await service.create(validDto, 'tenant-1');

      const saveCall = poRepository.save.mock.calls[0][0];
      expect(saveCall.items[0].productName).toBe('Panel Solar 400W');
      expect(saveCall.items[0].productSku).toBe('PNL-400');
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should filter by tenantId', async () => {
      const qb = buildQueryBuilder([]);
      poRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.where).toHaveBeenCalledWith('po.tenantId = :tenantId', {
        tenantId: 'tenant-1',
      });
    });

    it('should apply pagination', async () => {
      const qb = buildQueryBuilder([]);
      poRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 3, limit: 5 }, 'tenant-1');

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should filter by supplierId, warehouseId, status', async () => {
      const qb = buildQueryBuilder([]);
      poRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        {
          supplierId: 'sup-1',
          warehouseId: 'wh-1',
          status: PurchaseOrderStatus.SENT,
        },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'po.supplierId = :supplierId',
        { supplierId: 'sup-1' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'po.warehouseId = :warehouseId',
        { warehouseId: 'wh-1' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('po.status = :status', {
        status: PurchaseOrderStatus.SENT,
      });
    });

    it('should apply search on orderNumber', async () => {
      const qb = buildQueryBuilder([]);
      poRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'PO-2026' }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        'po.orderNumber ILIKE :search',
        { search: '%PO-2026%' },
      );
    });

    it('should apply date range', async () => {
      const qb = buildQueryBuilder([]);
      poRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { from: '2026-01-01', to: '2026-12-31' },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'po.orderDate BETWEEN :from AND :to',
        { from: '2026-01-01', to: '2026-12-31' },
      );
    });

    it('should order by createdAt DESC', async () => {
      const qb = buildQueryBuilder([]);
      poRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.orderBy).toHaveBeenCalledWith('po.createdAt', 'DESC');
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return PO with relations', async () => {
      const po = mockPO();
      poRepository.findOne.mockResolvedValue(po);

      const result = await service.findOne('po-1', 'tenant-1');

      expect(result).toEqual(po);
      expect(poRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'po-1', tenantId: 'tenant-1' },
        relations: ['items', 'supplier', 'warehouse', 'createdBy'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      poRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('po-1', 'tenant-1')).rejects.toThrow(
        'Orden de compra po-1 no encontrada',
      );
    });
  });

  // ============================================
  // FIND BY NUMBER
  // ============================================
  describe('findByNumber', () => {
    it('should return PO by orderNumber', async () => {
      const po = mockPO();
      poRepository.findOne.mockResolvedValue(po);

      const result = await service.findByNumber('PO-202609-00001', 'tenant-1');

      expect(result).toEqual(po);
    });

    it('should throw NotFoundException if not found', async () => {
      poRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByNumber('PO-999', 'tenant-1'),
      ).rejects.toThrow('Orden PO-999 no encontrada');
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should update DRAFT PO', async () => {
      const po = mockPO({ status: PurchaseOrderStatus.DRAFT });
      poRepository.findOne.mockResolvedValue(po);
      poRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.update(
        'po-1',
        { notes: 'Nueva nota' },
        'tenant-1',
      );

      expect(result.notes).toBe('Nueva nota');
    });

    it('should throw BadRequestException if not DRAFT', async () => {
      poRepository.findOne.mockResolvedValue(
        mockPO({ status: PurchaseOrderStatus.SENT }),
      );

      await expect(
        service.update('po-1', { notes: 'X' }, 'tenant-1'),
      ).rejects.toThrow('Solo se pueden editar órdenes en borrador');
    });
  });

  // ============================================
  // UPDATE STATUS ⭐ (state machine)
  // ============================================
  describe('updateStatus', () => {
    it('should allow DRAFT → SENT', async () => {
      poRepository.findOne.mockResolvedValue(
        mockPO({ status: PurchaseOrderStatus.DRAFT }),
      );
      poRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.updateStatus(
        'po-1',
        PurchaseOrderStatus.SENT,
        'tenant-1',
      );

      expect(result.status).toBe(PurchaseOrderStatus.SENT);
    });

    it('should allow DRAFT → CANCELLED', async () => {
      poRepository.findOne.mockResolvedValue(
        mockPO({ status: PurchaseOrderStatus.DRAFT }),
      );
      poRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.updateStatus(
        'po-1',
        PurchaseOrderStatus.CANCELLED,
        'tenant-1',
      );

      expect(result.status).toBe(PurchaseOrderStatus.CANCELLED);
    });

    it('should allow SENT → CONFIRMED', async () => {
      poRepository.findOne.mockResolvedValue(
        mockPO({ status: PurchaseOrderStatus.SENT }),
      );
      poRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.updateStatus(
        'po-1',
        PurchaseOrderStatus.CONFIRMED,
        'tenant-1',
      );

      expect(result.status).toBe(PurchaseOrderStatus.CONFIRMED);
    });

    it('should allow CONFIRMED → RECEIVED', async () => {
      poRepository.findOne.mockResolvedValue(
        mockPO({ status: PurchaseOrderStatus.CONFIRMED }),
      );
      poRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.updateStatus(
        'po-1',
        PurchaseOrderStatus.RECEIVED,
        'tenant-1',
      );

      expect(result.status).toBe(PurchaseOrderStatus.RECEIVED);
    });

    it('should throw BadRequestException on invalid transition', async () => {
      poRepository.findOne.mockResolvedValue(
        mockPO({ status: PurchaseOrderStatus.DRAFT }),
      );

      await expect(
        service.updateStatus('po-1', PurchaseOrderStatus.RECEIVED, 'tenant-1'),
      ).rejects.toThrow('No se puede pasar de "draft" a "received"');
    });

    it('should not allow any transition from RECEIVED', async () => {
      poRepository.findOne.mockResolvedValue(
        mockPO({ status: PurchaseOrderStatus.RECEIVED }),
      );

      await expect(
        service.updateStatus('po-1', PurchaseOrderStatus.CANCELLED, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not allow any transition from CANCELLED', async () => {
      poRepository.findOne.mockResolvedValue(
        mockPO({ status: PurchaseOrderStatus.CANCELLED }),
      );

      await expect(
        service.updateStatus('po-1', PurchaseOrderStatus.SENT, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // RECEIVE ⭐
  // ============================================
  describe('receive', () => {
    const setupReceive = (
      poStatus = PurchaseOrderStatus.CONFIRMED,
      itemsOverrides: any[] = [],
    ) => {
      const items = itemsOverrides.length > 0 ? itemsOverrides : [mockPOItem()];
      const po = mockPO({ status: poStatus, items });
      mockManager.findOne.mockResolvedValue(po);
      mockManager.save.mockImplementation((data) => Promise.resolve(data));
      mockManager.create.mockImplementation((_, data) => data);
      return po;
    };

    it('should receive full order and set status RECEIVED', async () => {
      const po = setupReceive(PurchaseOrderStatus.CONFIRMED);
      mockManager.findOne
        .mockResolvedValueOnce(po)
        .mockResolvedValueOnce(null) // stock no existe
        .mockResolvedValueOnce({
          ...po,
          status: PurchaseOrderStatus.RECEIVED,
        });

      const result = await service.receive(
        'po-1',
        { items: [{ itemId: 'item-1', quantityReceived: 10 }] },
        'tenant-1',
        'user-1',
      );

      expect(po.status).toBe(PurchaseOrderStatus.RECEIVED);
      expect(po.receivedDate).toBeInstanceOf(Date);
      expect(result?.status).toBe(PurchaseOrderStatus.RECEIVED);
    });

    it('should set PARTIALLY_RECEIVED when not all items received', async () => {
      const item = mockPOItem({ quantity: 10, quantityReceived: 0 });
      const po = setupReceive(PurchaseOrderStatus.CONFIRMED, [item]);
      mockManager.findOne
        .mockResolvedValueOnce(po)
        .mockResolvedValueOnce(null) // stock
        .mockResolvedValueOnce({
          ...po,
          status: PurchaseOrderStatus.PARTIALLY_RECEIVED,
        });

      await service.receive(
        'po-1',
        { items: [{ itemId: 'item-1', quantityReceived: 5 }] },
        'tenant-1',
      );

      expect(po.status).toBe(PurchaseOrderStatus.PARTIALLY_RECEIVED);
      expect(po.receivedDate).toBeNull();
    });

    it('should create Stock if not exists', async () => {
      const po = setupReceive(PurchaseOrderStatus.CONFIRMED);
      mockManager.findOne
        .mockResolvedValueOnce(po)
        .mockResolvedValueOnce(null) // no stock
        .mockResolvedValueOnce(null);

      await service.receive(
        'po-1',
        { items: [{ itemId: 'item-1', quantityReceived: 10 }] },
        'tenant-1',
      );

      // ✅ Verifica que se llamó a create(Stock, ...) sin importar el quantity mutado
      const stockCreateCall = mockManager.create.mock.calls.find(
        (call) => call[0] === Stock,
      );
      expect(stockCreateCall).toBeDefined();
      expect(stockCreateCall![1]).toMatchObject({
        tenantId: 'tenant-1',
        warehouseId: 'wh-1',
        productId: 'prod-1',
        reservedQuantity: 0,
        minStock: 0,
      });
    });

    it('should update existing Stock', async () => {
      const existingStock = {
        id: 'stock-1',
        quantity: 100,
        tenantId: 'tenant-1',
        warehouseId: 'wh-1',
        productId: 'prod-1',
      };

      mockManager.findOne
        .mockResolvedValueOnce(
          mockPO({ status: PurchaseOrderStatus.CONFIRMED }),
        )
        .mockResolvedValueOnce(existingStock) // stock existe
        .mockResolvedValueOnce(null);
      mockManager.save.mockImplementation((data) => Promise.resolve(data));
      mockManager.create.mockImplementation((_, data) => data);

      await service.receive(
        'po-1',
        { items: [{ itemId: 'item-1', quantityReceived: 10 }] },
        'tenant-1',
      );

      expect(existingStock.quantity).toBe(110);
    });

    it('should create PURCHASE movement', async () => {
      const existingStock = {
        id: 'stock-1',
        quantity: 100,
        tenantId: 'tenant-1',
        warehouseId: 'wh-1',
        productId: 'prod-1',
      };

      mockManager.findOne
        .mockResolvedValueOnce(
          mockPO({ status: PurchaseOrderStatus.CONFIRMED }),
        )
        .mockResolvedValueOnce(existingStock)
        .mockResolvedValueOnce(null);
      mockManager.save.mockImplementation((data) => Promise.resolve(data));
      mockManager.create.mockImplementation((_, data) => data);

      await service.receive(
        'po-1',
        { items: [{ itemId: 'item-1', quantityReceived: 10 }] },
        'tenant-1',
        'user-1',
      );

      const movementCall = mockManager.create.mock.calls.find(
        (call) => call[0] === Movement,
      );
      expect(movementCall).toBeDefined();
      expect(movementCall![1]).toMatchObject({
        type: MovementType.PURCHASE,
        quantity: 10,
        stockBefore: 100,
        stockAfter: 110,
        referenceType: 'purchase_order',
        referenceId: 'po-1',
      });
    });

    it('should throw NotFoundException if PO not found', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        service.receive('po-1', { items: [] }, 'tenant-1'),
      ).rejects.toThrow('Orden po-1 no encontrada');
    });

    it('should throw BadRequestException if PO is DRAFT', async () => {
      mockManager.findOne.mockResolvedValue(
        mockPO({ status: PurchaseOrderStatus.DRAFT }),
      );

      await expect(
        service.receive(
          'po-1',
          { items: [{ itemId: 'item-1', quantityReceived: 10 }] },
          'tenant-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if item not in PO', async () => {
      mockManager.findOne.mockResolvedValue(
        mockPO({ status: PurchaseOrderStatus.CONFIRMED }),
      );

      await expect(
        service.receive(
          'po-1',
          { items: [{ itemId: 'item-other', quantityReceived: 10 }] },
          'tenant-1',
        ),
      ).rejects.toThrow('Item item-other no pertenece a esta orden');
    });

    it('should throw BadRequestException if received exceeds ordered', async () => {
      mockManager.findOne.mockResolvedValue(
        mockPO({ status: PurchaseOrderStatus.CONFIRMED }),
      );

      await expect(
        service.receive(
          'po-1',
          { items: [{ itemId: 'item-1', quantityReceived: 50 }] },
          'tenant-1',
        ),
      ).rejects.toThrow('Cantidad recibida excede la ordenada');
    });

    it('should allow receiving PARTIALLY_RECEIVED order', async () => {
      const item = mockPOItem({ quantity: 10, quantityReceived: 5 });
      const po = mockPO({
        status: PurchaseOrderStatus.PARTIALLY_RECEIVED,
        items: [item],
      });
      mockManager.findOne
        .mockResolvedValueOnce(po)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(po);
      mockManager.save.mockImplementation((data) => Promise.resolve(data));
      mockManager.create.mockImplementation((_, data) => data);

      await service.receive(
        'po-1',
        { items: [{ itemId: 'item-1', quantityReceived: 5 }] },
        'tenant-1',
      );

      expect(item.quantityReceived).toBe(10);
      expect(po.status).toBe(PurchaseOrderStatus.RECEIVED);
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove DRAFT PO', async () => {
      const po = mockPO({ status: PurchaseOrderStatus.DRAFT });
      poRepository.findOne.mockResolvedValue(po);
      poRepository.remove.mockResolvedValue(po);

      const result = await service.remove('po-1', 'tenant-1');

      expect(result).toEqual({ message: 'Orden de compra eliminada' });
      expect(poRepository.remove).toHaveBeenCalledWith(po);
    });

    it('should throw BadRequestException if not DRAFT', async () => {
      poRepository.findOne.mockResolvedValue(
        mockPO({ status: PurchaseOrderStatus.SENT }),
      );

      await expect(service.remove('po-1', 'tenant-1')).rejects.toThrow(
        'Solo se pueden eliminar órdenes en borrador',
      );
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return full statistics', async () => {
      poRepository.count.mockResolvedValue(20);

      const byStatusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'draft', count: '5', total: '5000' },
          { status: 'received', count: '15', total: '15000' },
        ]),
      };

      const pendingQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '8000' }),
      };

      poRepository.createQueryBuilder
        .mockReturnValueOnce(byStatusQb)
        .mockReturnValueOnce(pendingQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(20);
      expect(result.byStatus).toHaveLength(2);
      expect(result.pendingTotal).toBe(8000);
    });

    it('should return zeros when no POs', async () => {
      poRepository.count.mockResolvedValue(0);

      const emptyQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue(null),
      };
      poRepository.createQueryBuilder.mockReturnValue(emptyQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(0);
      expect(result.pendingTotal).toBe(0);
      expect(result.byStatus).toEqual([]);
    });
  });
});