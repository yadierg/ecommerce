// apps/inventory-api/src/modules/stocks/stocks.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { StocksService } from './stocks.service';
import { Stock, Product, Warehouse } from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockStocksRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockProductsRepository = {
  findOne: jest.fn(),
};

const mockWarehousesRepository = {
  findOne: jest.fn(),
};

// Manager mockeado para transacciones
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
describe('StocksService', () => {
  let service: StocksService;
  let stocksRepository: typeof mockStocksRepository;
  let productsRepository: typeof mockProductsRepository;
  let warehousesRepository: typeof mockWarehousesRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StocksService,
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
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<StocksService>(StocksService);
    stocksRepository = module.get(getRepositoryToken(Stock));
    productsRepository = module.get(getRepositoryToken(Product));
    warehousesRepository = module.get(getRepositoryToken(Warehouse));
  });

  afterEach(() => {
    jest.clearAllMocks();
    [
      mockStocksRepository,
      mockProductsRepository,
      mockWarehousesRepository,
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
  const mockStock = (overrides: Partial<Stock> = {}): Stock =>
    ({
      id: 'stock-1',
      tenantId: 'tenant-1',
      warehouseId: 'wh-1',
      productId: 'prod-1',
      quantity: 50,
      reservedQuantity: 0,
      minStock: 10,
      maxStock: 100,
      location: 'A-1-3',
      shelf: null,
      bin: null,
      notes: null,
      ...overrides,
    }) as Stock;

  const mockProduct = { id: 'prod-1', name: 'Panel Solar', tenantId: 'tenant-1' };
  const mockWarehouse = { id: 'wh-1', name: 'Almacén Central', tenantId: 'tenant-1' };

  const buildQueryBuilder = (data: any[], total?: number) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([data, total ?? data.length]),
    getMany: jest.fn().mockResolvedValue(data),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
  });

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto = {
      productId: 'prod-1',
      warehouseId: 'wh-1',
      quantity: 100,
    };

    it('should create stock with reservedQuantity = 0', async () => {
      productsRepository.findOne.mockResolvedValue(mockProduct);
      warehousesRepository.findOne.mockResolvedValue(mockWarehouse);
      stocksRepository.findOne.mockResolvedValue(null);
      stocksRepository.create.mockImplementation((data) => data);
      stocksRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'stock-1' }),
      );

      const result = await service.create(validDto, 'tenant-1');

      expect(stocksRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validDto,
          tenantId: 'tenant-1',
          reservedQuantity: 0,
        }),
      );
      expect(result.id).toBe('stock-1');
    });

    it('should validate product belongs to tenant', async () => {
      productsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(validDto, 'tenant-1'),
      ).rejects.toThrow('Producto no encontrado en tu empresa');
    });

    it('should validate warehouse belongs to tenant', async () => {
      productsRepository.findOne.mockResolvedValue(mockProduct);
      warehousesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(validDto, 'tenant-1'),
      ).rejects.toThrow('Almacén no encontrado en tu empresa');
    });

    it('should throw ConflictException if stock already exists', async () => {
      productsRepository.findOne.mockResolvedValue(mockProduct);
      warehousesRepository.findOne.mockResolvedValue(mockWarehouse);
      stocksRepository.findOne.mockResolvedValue(mockStock());

      await expect(
        service.create(validDto, 'tenant-1'),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.create(validDto, 'tenant-1'),
      ).rejects.toThrow('Ya existe stock de este producto en este almacén');
    });
  });

  // ============================================
  // UPSERT
  // ============================================
  describe('upsert', () => {
    const validDto = {
      productId: 'prod-1',
      warehouseId: 'wh-1',
      quantity: 100,
    };

    it('should create if not exists', async () => {
      productsRepository.findOne.mockResolvedValue(mockProduct);
      warehousesRepository.findOne.mockResolvedValue(mockWarehouse);
      stocksRepository.findOne.mockResolvedValue(null);
      stocksRepository.create.mockImplementation((data) => data);
      stocksRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'stock-1' }),
      );

      const result = await service.upsert(validDto, 'tenant-1');

      expect(result.id).toBe('stock-1');
      expect(stocksRepository.create).toHaveBeenCalled();
    });

    it('should update quantity if exists', async () => {
      const existing = mockStock({ quantity: 50 });
      stocksRepository.findOne.mockResolvedValue(existing);
      stocksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.upsert(validDto, 'tenant-1');

      expect(result.quantity).toBe(100);
      expect(stocksRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 100 }),
      );
    });

    it('should update optional fields only when provided', async () => {
      const existing = mockStock({ minStock: 10, location: 'OLD' });
      stocksRepository.findOne.mockResolvedValue(existing);
      stocksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.upsert(
        { ...validDto, minStock: 20 },
        'tenant-1',
      );

      expect(existing.minStock).toBe(20);
      expect(existing.location).toBe('OLD'); // sin cambios
    });

    it('should not update optional fields when undefined', async () => {
      const existing = mockStock({ minStock: 10, maxStock: 200 });
      stocksRepository.findOne.mockResolvedValue(existing);
      stocksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.upsert(validDto, 'tenant-1');

      expect(existing.minStock).toBe(10);
      expect(existing.maxStock).toBe(200);
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should filter by tenantId and include availableQuantity', async () => {
      const stocks = [
        mockStock({ quantity: 50, reservedQuantity: 10 }),
      ];
      const qb = buildQueryBuilder(stocks, 1);
      stocksRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({}, 'tenant-1');

      expect(result.data[0].availableQuantity).toBe(40);
      expect(result.meta.total).toBe(1);
    });

    it('should apply pagination', async () => {
      const qb = buildQueryBuilder([]);
      stocksRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 3, limit: 5 }, 'tenant-1');

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should filter by warehouseId and productId', async () => {
      const qb = buildQueryBuilder([]);
      stocksRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { warehouseId: 'wh-1', productId: 'prod-1' },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'stock.warehouseId = :warehouseId',
        { warehouseId: 'wh-1' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'stock.productId = :productId',
        { productId: 'prod-1' },
      );
    });

    it('should apply lowStock filter (quantity <= minStock AND quantity > 0)', async () => {
      const qb = buildQueryBuilder([]);
      stocksRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ lowStock: true }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        'stock.quantity <= stock.minStock',
      );
      expect(qb.andWhere).toHaveBeenCalledWith('stock.quantity > 0');
    });

    it('should apply outOfStock filter (quantity = 0)', async () => {
      const qb = buildQueryBuilder([]);
      stocksRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ outOfStock: true }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith('stock.quantity = 0');
    });

    it('should order by product.name then warehouse.name', async () => {
      const qb = buildQueryBuilder([]);
      stocksRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.orderBy).toHaveBeenCalledWith('product.name', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('warehouse.name', 'ASC');
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return stock with relations', async () => {
      const stock = mockStock();
      stocksRepository.findOne.mockResolvedValue(stock);

      const result = await service.findOne('stock-1', 'tenant-1');

      expect(result).toEqual(stock);
      expect(stocksRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'stock-1', tenantId: 'tenant-1' },
        relations: ['product', 'warehouse'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      stocksRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('stock-1', 'tenant-1')).rejects.toThrow(
        'Stock stock-1 no encontrado',
      );
    });
  });

  // ============================================
  // FIND BY WAREHOUSE
  // ============================================
  describe('findByWarehouse', () => {
    it('should return stocks of warehouse ordered by quantity DESC', async () => {
      const stocks = [mockStock()];
      stocksRepository.find.mockResolvedValue(stocks);

      const result = await service.findByWarehouse('wh-1', 'tenant-1');

      expect(result).toEqual(stocks);
      expect(stocksRepository.find).toHaveBeenCalledWith({
        where: { warehouseId: 'wh-1', tenantId: 'tenant-1' },
        relations: ['product'],
        order: { quantity: 'DESC' },
      });
    });
  });

  // ============================================
  // FIND BY PRODUCT (con agregados)
  // ============================================
  describe('findByProduct', () => {
    it('should return aggregated totals across warehouses', async () => {
      stocksRepository.find.mockResolvedValue([
        mockStock({ quantity: 50, reservedQuantity: 10 }),
        mockStock({
          id: 'stock-2',
          warehouseId: 'wh-2',
          quantity: 30,
          reservedQuantity: 5,
        }),
      ]);

      const result = await service.findByProduct('prod-1', 'tenant-1');

      expect(result.productId).toBe('prod-1');
      expect(result.totalQuantity).toBe(80);
      expect(result.totalReserved).toBe(15);
      expect(result.totalAvailable).toBe(65);
      expect(result.stocks).toHaveLength(2);
    });

    it('should include availableQuantity per stock', async () => {
      stocksRepository.find.mockResolvedValue([
        mockStock({ quantity: 50, reservedQuantity: 10 }),
      ]);

      const result = await service.findByProduct('prod-1', 'tenant-1');

      expect(result.stocks[0].availableQuantity).toBe(40);
    });

    it('should return zeros when product has no stock', async () => {
      stocksRepository.find.mockResolvedValue([]);

      const result = await service.findByProduct('prod-1', 'tenant-1');

      expect(result.totalQuantity).toBe(0);
      expect(result.totalReserved).toBe(0);
      expect(result.totalAvailable).toBe(0);
    });
  });

  // ============================================
  // FIND LOW STOCK
  // ============================================
  describe('findLowStock', () => {
    it('should return low stock items ordered by quantity ASC', async () => {
      const stocks = [mockStock({ quantity: 5, minStock: 10 })];
      const qb = buildQueryBuilder(stocks);
      stocksRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findLowStock('tenant-1');

      expect(result).toEqual(stocks);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'stock.quantity <= stock.minStock',
      );
      expect(qb.andWhere).toHaveBeenCalledWith('stock.quantity > 0');
      expect(qb.orderBy).toHaveBeenCalledWith('stock.quantity', 'ASC');
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should update stock fields', async () => {
      const stock = mockStock();
      stocksRepository.findOne.mockResolvedValue(stock);
      stocksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update(
        'stock-1',
        { minStock: 20, location: 'B-2-1' },
        'tenant-1',
      );

      expect(result.minStock).toBe(20);
      expect(result.location).toBe('B-2-1');
    });

    it('should throw NotFoundException if not found', async () => {
      stocksRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('stock-1', { minStock: 20 }, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // ADJUST ⭐
  // ============================================
  describe('adjust', () => {
    it('should increase quantity with positive adjust', async () => {
      const stock = mockStock({ quantity: 50 });
      stocksRepository.findOne.mockResolvedValue(stock);
      stocksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.adjust(
        'stock-1',
        { quantity: 10, reason: 'Compra' },
        'tenant-1',
        'user-1',
      );

      expect(result.quantity).toBe(60);
    });

    it('should decrease quantity with negative adjust', async () => {
      const stock = mockStock({ quantity: 50 });
      stocksRepository.findOne.mockResolvedValue(stock);
      stocksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.adjust(
        'stock-1',
        { quantity: -20, reason: 'Merma' },
        'tenant-1',
      );

      expect(result.quantity).toBe(30);
    });

    it('should throw BadRequestException if stock goes negative', async () => {
      const stock = mockStock({ quantity: 10 });
      stocksRepository.findOne.mockResolvedValue(stock);

      await expect(
        service.adjust(
          'stock-1',
          { quantity: -20, reason: 'X' },
          'tenant-1',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.adjust(
          'stock-1',
          { quantity: -20, reason: 'X' },
          'tenant-1',
        ),
      ).rejects.toThrow('Stock insuficiente. Disponible: 10, ajuste: -20');
    });

    it('should append notes when notes provided', async () => {
      const stock = mockStock({ quantity: 50, notes: 'previo' });
      stocksRepository.findOne.mockResolvedValue(stock);
      stocksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.adjust(
        'stock-1',
        { quantity: 10, reason: 'Compra', notes: 'nota extra' },
        'tenant-1',
      );

      expect(stock.notes).toContain('[Ajuste]: Compra (+10)');
      expect(stock.notes).toContain('previo');
    });

    it('should NOT append notes when notes not provided', async () => {
      const stock = mockStock({ quantity: 50, notes: 'original' });
      stocksRepository.findOne.mockResolvedValue(stock);
      stocksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.adjust(
        'stock-1',
        { quantity: 10, reason: 'Compra' },
        'tenant-1',
      );

      expect(stock.notes).toBe('original');
    });

    it('should format negative adjust in notes with proper sign', async () => {
      const stock = mockStock({ quantity: 50, notes: 'previo' });
      stocksRepository.findOne.mockResolvedValue(stock);
      stocksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.adjust(
        'stock-1',
        { quantity: -10, reason: 'Merma', notes: 'dañado' },
        'tenant-1',
      );

      expect(stock.notes).toContain('[Ajuste]: Merma (-10)');
    });
  });

  // ============================================
  // TRANSFER ⭐
  // ============================================
  describe('transfer', () => {
    const validDto = {
      productId: 'prod-1',
      fromWarehouseId: 'wh-1',
      toWarehouseId: 'wh-2',
      quantity: 20,
    };

    it('should throw BadRequestException if same warehouse', async () => {
      await expect(
        service.transfer(
          { ...validDto, toWarehouseId: 'wh-1' },
          'tenant-1',
        ),
      ).rejects.toThrow('El almacén de origen y destino deben ser diferentes');
    });

    it('should transfer stock between warehouses', async () => {
      const fromStock = mockStock({ warehouseId: 'wh-1', quantity: 100 });
      const toStock = mockStock({
        id: 'stock-2',
        warehouseId: 'wh-2',
        quantity: 30,
      });

      mockManager.findOne
        .mockResolvedValueOnce(fromStock)
        .mockResolvedValueOnce(toStock);
      mockManager.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.transfer(validDto, 'tenant-1');

      expect(fromStock.quantity).toBe(80); // 100 - 20
      expect(toStock.quantity).toBe(50); // 30 + 20
      expect(result.message).toContain('20 unidades');
      expect(result.from).toEqual(fromStock);
      expect(result.to).toEqual(toStock);
    });

    it('should create destination stock if not exists', async () => {
      const fromStock = mockStock({ warehouseId: 'wh-1', quantity: 100 });
      const newToStock = mockStock({
        id: 'stock-new',
        warehouseId: 'wh-2',
        quantity: 0,
      });

      mockManager.findOne
        .mockResolvedValueOnce(fromStock)
        .mockResolvedValueOnce(null); // no existe destino

      mockManager.create.mockReturnValue(newToStock);
      mockManager.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.transfer(validDto, 'tenant-1');

      expect(mockManager.create).toHaveBeenCalledWith(
        Stock,
        expect.objectContaining({
          tenantId: 'tenant-1',
          productId: 'prod-1',
          warehouseId: 'wh-2',
          quantity: 0,
          reservedQuantity: 0,
          minStock: 0,
        }),
      );
      expect(result.to.quantity).toBe(20);
    });

    it('should throw NotFoundException if origin stock not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.transfer(validDto, 'tenant-1'),
      ).rejects.toThrow('Producto no encontrado en almacén origen');
    });

    it('should throw BadRequestException if insufficient stock in origin', async () => {
      mockManager.findOne.mockResolvedValue(
      mockStock({ quantity: 10 }),
        );

        await expect(
            service.transfer(validDto, 'tenant-1'),
        ).rejects.toThrow(BadRequestException);

        await expect(
            service.transfer(validDto, 'tenant-1'),
        ).rejects.toThrow('Stock insuficiente en origen. Disponible: 10');
    });

    it('should use transaction', async () => {
      const fromStock = mockStock({ quantity: 100 });
      const toStock = mockStock({ id: 'stock-2', quantity: 30 });
      mockManager.findOne
        .mockResolvedValueOnce(fromStock)
        .mockResolvedValueOnce(toStock);
      mockManager.save.mockImplementation((data) => Promise.resolve(data));

      await service.transfer(validDto, 'tenant-1');

      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should save both stocks', async () => {
      const fromStock = mockStock({ warehouseId: 'wh-1', quantity: 100 });
      const toStock = mockStock({
        id: 'stock-2',
        warehouseId: 'wh-2',
        quantity: 30,
      });
      mockManager.findOne
        .mockResolvedValueOnce(fromStock)
        .mockResolvedValueOnce(toStock);
      mockManager.save.mockImplementation((data) => Promise.resolve(data));

      await service.transfer(validDto, 'tenant-1');

      expect(mockManager.save).toHaveBeenCalledWith(fromStock);
      expect(mockManager.save).toHaveBeenCalledWith(toStock);
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove stock with quantity 0', async () => {
      const stock = mockStock({ quantity: 0 });
      stocksRepository.findOne.mockResolvedValue(stock);
      stocksRepository.remove.mockResolvedValue(stock);

      const result = await service.remove('stock-1', 'tenant-1');

      expect(result).toEqual({ message: 'Stock eliminado' });
      expect(stocksRepository.remove).toHaveBeenCalledWith(stock);
    });

    it('should throw BadRequestException if quantity > 0', async () => {
      stocksRepository.findOne.mockResolvedValue(mockStock({ quantity: 5 }));

      await expect(service.remove('stock-1', 'tenant-1')).rejects.toThrow(
        'No se puede eliminar un stock con cantidad mayor a 0',
      );
    });

    it('should not call remove if quantity > 0', async () => {
      stocksRepository.findOne.mockResolvedValue(mockStock({ quantity: 5 }));

      await expect(service.remove('stock-1', 'tenant-1')).rejects.toThrow();

      expect(stocksRepository.remove).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return full statistics', async () => {
      stocksRepository.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(3); // outOfStock

      const totalQtyQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '1500' }),
      };

      const lowStockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };

      const byWarehouseQb = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { warehouseName: 'Central', totalQuantity: '1000', productCount: '15' },
          { warehouseName: 'Norte', totalQuantity: '500', productCount: '5' },
        ]),
      };

      stocksRepository.createQueryBuilder
        .mockReturnValueOnce(totalQtyQb)
        .mockReturnValueOnce(lowStockQb)
        .mockReturnValueOnce(byWarehouseQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(20);
      expect(result.totalQuantity).toBe(1500);
      expect(result.lowStockCount).toBe(5);
      expect(result.outOfStockCount).toBe(3);
      expect(result.byWarehouse).toHaveLength(2);
    });

    it('should return zeros when no stock', async () => {
      stocksRepository.count.mockResolvedValue(0);

      const emptyQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
        getRawMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
      };
      stocksRepository.createQueryBuilder.mockReturnValue(emptyQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(0);
      expect(result.totalQuantity).toBe(0);
      expect(result.lowStockCount).toBe(0);
      expect(result.outOfStockCount).toBe(0);
      expect(result.byWarehouse).toEqual([]);
    });
  });
});