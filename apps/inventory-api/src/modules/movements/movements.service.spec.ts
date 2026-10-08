// apps/inventory-api/src/modules/movements/movements.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { MovementsService } from './movements.service';
import {
  Movement,
  MovementType,
  Stock,
  Product,
  Warehouse,
} from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockMovementsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockStocksRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockProductsRepository = {
  findOne: jest.fn(),
};

const mockWarehousesRepository = {
  findOne: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('MovementsService', () => {
  let service: MovementsService;
  let movementsRepository: typeof mockMovementsRepository;
  let stocksRepository: typeof mockStocksRepository;
  let productsRepository: typeof mockProductsRepository;
  let warehousesRepository: typeof mockWarehousesRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementsService,
        {
          provide: getRepositoryToken(Movement),
          useValue: mockMovementsRepository,
        },
        {
          provide: getRepositoryToken(Stock),
          useValue: mockStocksRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductsRepository,
        },
        {
          provide: getRepositoryToken(Warehouse),
          useValue: mockWarehousesRepository,
        },
      ],
    }).compile();

    service = module.get<MovementsService>(MovementsService);
    movementsRepository = module.get(getRepositoryToken(Movement));
    stocksRepository = module.get(getRepositoryToken(Stock));
    productsRepository = module.get(getRepositoryToken(Product));
    warehousesRepository = module.get(getRepositoryToken(Warehouse));
  });

  afterEach(() => {
    jest.clearAllMocks();
    [
      mockMovementsRepository,
      mockStocksRepository,
      mockProductsRepository,
      mockWarehousesRepository,
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
  const mockMovement = (overrides: Partial<Movement> = {}): Movement =>
    ({
      id: 'mov-1',
      tenantId: 'tenant-1',
      warehouseId: 'wh-1',
      productId: 'prod-1',
      userId: 'user-1',
      type: MovementType.PURCHASE,
      quantity: 10,
      stockBefore: 0,
      stockAfter: 10,
      referenceType: null,
      referenceId: null,
      reason: null,
      notes: null,
      metadata: null,
      createdAt: new Date(),
      ...overrides,
    }) as Movement;

  const mockStock = (overrides: Partial<Stock> = {}): Stock =>
    ({
      id: 'stock-1',
      tenantId: 'tenant-1',
      warehouseId: 'wh-1',
      productId: 'prod-1',
      quantity: 50,
      reservedQuantity: 0,
      minStock: 0,
      ...overrides,
    }) as Stock;

  const mockProduct = { id: 'prod-1', name: 'Panel Solar', tenantId: 'tenant-1' };
  const mockWarehouse = { id: 'wh-1', name: 'Almacén Central', tenantId: 'tenant-1' };

  const buildQueryBuilder = () => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  });

  // ============================================
  // CREATE (manual)
  // ============================================
  describe('create', () => {
    const validDto = {
      productId: 'prod-1',
      warehouseId: 'wh-1',
      type: MovementType.PURCHASE,
      quantity: 10,
    };

    const setupCreateSuccess = (stockOverrides = {}) => {
      productsRepository.findOne.mockResolvedValue(mockProduct);
      warehousesRepository.findOne.mockResolvedValue(mockWarehouse);
      stocksRepository.findOne.mockResolvedValue(mockStock(stockOverrides));
      stocksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      movementsRepository.create.mockImplementation((data) => data);
      movementsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'mov-1' }),
      );
    };

    it('should create movement with correct stock snapshot', async () => {
      setupCreateSuccess({ quantity: 50 });

      const result = await service.create(validDto, 'tenant-1', 'user-1');

      expect(movementsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'prod-1',
          warehouseId: 'wh-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          type: MovementType.PURCHASE,
          quantity: 10,
          stockBefore: 50,
          stockAfter: 60,
        }),
      );
      expect(result.id).toBe('mov-1');
    });

    it('should update existing stock', async () => {
      setupCreateSuccess({ quantity: 50 });

      await service.create(validDto, 'tenant-1');

      expect(stocksRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 60 }),
      );
    });

    it('should create new stock when entering to non-existing stock', async () => {
      productsRepository.findOne.mockResolvedValue(mockProduct);
      warehousesRepository.findOne.mockResolvedValue(mockWarehouse);
      stocksRepository.findOne.mockResolvedValue(null);
      stocksRepository.create.mockImplementation((data) => data);
      stocksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      movementsRepository.create.mockImplementation((data) => data);
      movementsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'mov-1' }),
      );

      await service.create(validDto, 'tenant-1');

      expect(stocksRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          warehouseId: 'wh-1',
          productId: 'prod-1',
          quantity: 10,
          reservedQuantity: 0,
          minStock: 0,
        }),
      );
    });

    it('should throw BadRequestException if stock insufficient', async () => {
      productsRepository.findOne.mockResolvedValue(mockProduct);
      warehousesRepository.findOne.mockResolvedValue(mockWarehouse);
      stocksRepository.findOne.mockResolvedValue(mockStock({ quantity: 5 }));

      await expect(
        service.create(
          { ...validDto, type: MovementType.SALE, quantity: -10 },
          'tenant-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no stock and negative quantity', async () => {
        productsRepository.findOne.mockResolvedValue(mockProduct);
        warehousesRepository.findOne.mockResolvedValue(mockWarehouse);
        stocksRepository.findOne.mockResolvedValue(null);

        await expect(
            service.create(
            { ...validDto, type: MovementType.SALE, quantity: -5 },
            'tenant-1',
            ),
        ).rejects.toThrow('Stock insuficiente. Actual: 0, movimiento: -5');
    });

    it('should throw BadRequestException if product not found', async () => {
      productsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(validDto, 'tenant-1'),
      ).rejects.toThrow('Producto no encontrado');
    });

    it('should throw BadRequestException if warehouse not found', async () => {
      productsRepository.findOne.mockResolvedValue(mockProduct);
      warehousesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(validDto, 'tenant-1'),
      ).rejects.toThrow('Almacén no encontrado');
    });

    it('should validate product and warehouse with tenantId', async () => {
      setupCreateSuccess();

      await service.create(validDto, 'tenant-1');

      expect(productsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'prod-1', tenantId: 'tenant-1' },
      });
      expect(warehousesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'wh-1', tenantId: 'tenant-1' },
      });
    });

    it('should handle userId optional', async () => {
      setupCreateSuccess();

      await service.create(validDto, 'tenant-1');

      expect(movementsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: undefined }),
      );
    });
  });

  // ============================================
  // CREATE SYSTEM MOVEMENT
  // ============================================
  describe('createSystemMovement', () => {
    it('should create movement without validations', async () => {
      const data = {
        tenantId: 'tenant-1',
        warehouseId: 'wh-1',
        productId: 'prod-1',
        type: MovementType.CONSUMPTION,
        quantity: -100,
        stockBefore: 500,
        stockAfter: 400,
        referenceType: 'project_material',
        referenceId: 'mat-1',
        reason: 'Entrega a proyecto',
      };
      movementsRepository.create.mockImplementation((d) => d);
      movementsRepository.save.mockImplementation((d) =>
        Promise.resolve({ ...d, id: 'mov-1' }),
      );

      const result = await service.createSystemMovement(data);

      expect(movementsRepository.create).toHaveBeenCalledWith(data);
      expect(movementsRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('mov-1');
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should filter by tenantId', async () => {
      movementsRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({}, 'tenant-1');

      expect(movementsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
        }),
      );
    });

    it('should apply pagination', async () => {
      movementsRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 3, limit: 5 }, 'tenant-1');

      expect(movementsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('should filter by productId, warehouseId, userId, type', async () => {
      movementsRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        {
          productId: 'prod-1',
          warehouseId: 'wh-1',
          userId: 'user-1',
          type: MovementType.SALE,
        },
        'tenant-1',
      );

      const call = movementsRepository.findAndCount.mock.calls[0][0];
      expect(call.where.productId).toBe('prod-1');
      expect(call.where.warehouseId).toBe('wh-1');
      expect(call.where.userId).toBe('user-1');
      expect(call.where.type).toBe(MovementType.SALE);
    });

    it('should filter by referenceType and referenceId', async () => {
      movementsRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { referenceType: 'order', referenceId: 'order-1' },
        'tenant-1',
      );

      const call = movementsRepository.findAndCount.mock.calls[0][0];
      expect(call.where.referenceType).toBe('order');
      expect(call.where.referenceId).toBe('order-1');
    });

    it('should apply date range with Between', async () => {
      movementsRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        { from: '2026-01-01', to: '2026-12-31' },
        'tenant-1',
      );

      const call = movementsRepository.findAndCount.mock.calls[0][0];
      expect(call.where.createdAt).toBeDefined();
    });

    it('should include relations and order DESC', async () => {
      movementsRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({}, 'tenant-1');

      expect(movementsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['product', 'warehouse', 'user'],
          order: { createdAt: 'DESC' },
        }),
      );
    });

    it('should return paginated response with meta', async () => {
      movementsRepository.findAndCount.mockResolvedValue([[mockMovement()], 45]);

      const result = await service.findAll({ page: 2, limit: 20 }, 'tenant-1');

      expect(result.meta).toEqual({
        total: 45,
        page: 2,
        limit: 20,
        totalPages: 3,
      });
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return movement with relations', async () => {
      const mov = mockMovement();
      movementsRepository.findOne.mockResolvedValue(mov);

      const result = await service.findOne('mov-1', 'tenant-1');

      expect(result).toEqual(mov);
      expect(movementsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'mov-1', tenantId: 'tenant-1' },
        relations: ['product', 'warehouse', 'user'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      movementsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('mov-1', 'tenant-1')).rejects.toThrow(
        'Movimiento mov-1 no encontrado',
      );
    });
  });

  // ============================================
  // FIND BY PRODUCT
  // ============================================
  describe('findByProduct', () => {
    it('should return last 100 movements of product', async () => {
      const movements = [mockMovement()];
      movementsRepository.find.mockResolvedValue(movements);

      const result = await service.findByProduct('prod-1', 'tenant-1');

      expect(result).toEqual(movements);
      expect(movementsRepository.find).toHaveBeenCalledWith({
        where: { productId: 'prod-1', tenantId: 'tenant-1' },
        relations: ['warehouse', 'user'],
        order: { createdAt: 'DESC' },
        take: 100,
      });
    });

    it('should return empty array if no movements', async () => {
      movementsRepository.find.mockResolvedValue([]);

      const result = await service.findByProduct('prod-1', 'tenant-1');

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // FIND BY WAREHOUSE
  // ============================================
  describe('findByWarehouse', () => {
    it('should return last 100 movements of warehouse', async () => {
      const movements = [mockMovement()];
      movementsRepository.find.mockResolvedValue(movements);

      const result = await service.findByWarehouse('wh-1', 'tenant-1');

      expect(result).toEqual(movements);
      expect(movementsRepository.find).toHaveBeenCalledWith({
        where: { warehouseId: 'wh-1', tenantId: 'tenant-1' },
        relations: ['product', 'user'],
        order: { createdAt: 'DESC' },
        take: 100,
      });
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return full statistics', async () => {
      movementsRepository.count.mockResolvedValue(150);

      const byTypeQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { type: 'purchase', count: '50', totalQuantity: '500' },
          { type: 'sale', count: '100', totalQuantity: '-500' },
        ]),
      };

      const last7DaysQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { date: '2026-09-25', count: '10' },
        ]),
      };

      movementsRepository.createQueryBuilder
        .mockReturnValueOnce(byTypeQb)
        .mockReturnValueOnce(last7DaysQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(150);
      expect(result.byType).toHaveLength(2);
      expect(result.last7Days).toHaveLength(1);
    });

    it('should return zeros when no movements', async () => {
      movementsRepository.count.mockResolvedValue(0);

      const emptyQb = buildQueryBuilder();
      movementsRepository.createQueryBuilder.mockReturnValue(emptyQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(0);
      expect(result.byType).toEqual([]);
      expect(result.last7Days).toEqual([]);
    });

    it('should filter last7Days by date', async () => {
      movementsRepository.count.mockResolvedValue(0);

      const byTypeQb = buildQueryBuilder();
      const last7DaysQb = buildQueryBuilder();

      movementsRepository.createQueryBuilder
        .mockReturnValueOnce(byTypeQb)
        .mockReturnValueOnce(last7DaysQb);

      await service.getStats('tenant-1');

      expect(last7DaysQb.andWhere).toHaveBeenCalledWith(
        'movement.created_at >= :date',
        expect.objectContaining({ date: expect.any(Date) }),
      );
    });
  });
});