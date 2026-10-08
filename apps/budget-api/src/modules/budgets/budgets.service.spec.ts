// apps/budget-api/src/modules/budgets/budgets.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { BudgetsService } from './budgets.service';
import {
  Budget,
  BudgetItem,
  BudgetLaborItem,
  BudgetStatus,
  Client,
  Warehouse,
  Product,
} from '@ecommerce/core';
import { CreateBudgetDto } from './dto/create-budget.dto';

// ============================================
// MOCKS
// ============================================
const mockBudgetsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockItemsRepository = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockLaborRepository = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockClientsRepository = {
  findOne: jest.fn(),
};

const mockWarehousesRepository = {
  findOne: jest.fn(),
};

const mockProductsRepository = {
  findOne: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('BudgetsService', () => {
  let service: BudgetsService;
  let budgetsRepository: typeof mockBudgetsRepository;
  let itemsRepository: typeof mockItemsRepository;
  let laborRepository: typeof mockLaborRepository;
  let clientsRepository: typeof mockClientsRepository;
  let warehousesRepository: typeof mockWarehousesRepository;
  let productsRepository: typeof mockProductsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: getRepositoryToken(Budget), useValue: mockBudgetsRepository },
        { provide: getRepositoryToken(BudgetItem), useValue: mockItemsRepository },
        { provide: getRepositoryToken(BudgetLaborItem), useValue: mockLaborRepository },
        { provide: getRepositoryToken(Client), useValue: mockClientsRepository },
        { provide: getRepositoryToken(Warehouse), useValue: mockWarehousesRepository },
        { provide: getRepositoryToken(Product), useValue: mockProductsRepository },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    budgetsRepository = module.get(getRepositoryToken(Budget));
    itemsRepository = module.get(getRepositoryToken(BudgetItem));
    laborRepository = module.get(getRepositoryToken(BudgetLaborItem));
    clientsRepository = module.get(getRepositoryToken(Client));
    warehousesRepository = module.get(getRepositoryToken(Warehouse));
    productsRepository = module.get(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto: CreateBudgetDto = {
      clientId: 'client-1',
      warehouseId: 'warehouse-1',
      projectTitle: 'Instalación solar 10kW',
      siteAddress: 'Calle 123',
      validUntil: '2026-12-31',
      items: [
        {
          productId: 'product-1',
          quantity: 20,
          unitPrice: 800,
          taxRate: 16,
        },
      ],
      laborItems: [
        {
          description: 'Instalación de paneles',
          workerRole: 'electricista',
          quantity: 2,
          estimatedHours: 40,
          hourlyRate: 25,
        },
      ],
      additionalCosts: 500,
    };

    const mockClient = { id: 'client-1', name: 'Juan Pérez', tenantId: 'tenant-1' };
    const mockWarehouse = { id: 'warehouse-1', name: 'Almacén Central', tenantId: 'tenant-1' };
    const mockProduct = {
      id: 'product-1',
      name: 'iPhone Instel',
      sku: 'IPH-001',
      shortDescription: 'Smartphone de alta gama',
      description: 'El último iPhone',
    };

    const setupSuccessfulCreate = () => {
      clientsRepository.findOne.mockResolvedValue(mockClient);
      warehousesRepository.findOne.mockResolvedValue(mockWarehouse);
      productsRepository.findOne.mockResolvedValue(mockProduct);
      budgetsRepository.count.mockResolvedValue(0);
      itemsRepository.create.mockImplementation((data) => data);
      laborRepository.create.mockImplementation((data) => data);
      budgetsRepository.create.mockImplementation((data) => data);
      budgetsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'budget-1' }),
      );
    };

    it('should create budget with correct material totals', async () => {
      setupSuccessfulCreate();

      const result = await service.create(validDto, 'tenant-1', 'user-1');

      // Materiales: 20 * 800 = 16,000
      expect(result.materialsSubtotal).toBe(16000);
      // Tax: 16,000 * 16% = 2,560
      expect(result.tax).toBe(2560);
      // Labor: 2 * 40 * 25 = 2,000
      expect(result.laborSubtotal).toBe(2000);
      // Subtotal: 16,000 + 2,000 + 500 = 18,500
      expect(result.subtotal).toBe(18500);
      // Total: 18,500 + 2,560 = 21,060
      expect(result.total).toBe(21060);
    });

    it('should generate unique budget number', async () => {
      setupSuccessfulCreate();
      budgetsRepository.count.mockResolvedValue(5);

      const result = await service.create(validDto, 'tenant-1');

      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      expect(result.budgetNumber).toBe(`BUD-${year}${month}-00006`);
    });

    it('should snapshot product data in items', async () => {
      setupSuccessfulCreate();

      await service.create(validDto, 'tenant-1');

      expect(itemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: 'iPhone Instel',
          productSku: 'IPH-001',
        }),
      );
    });

    it('should set status to DRAFT', async () => {
      setupSuccessfulCreate();

      const result = await service.create(validDto, 'tenant-1');

      expect(result.status).toBe(BudgetStatus.DRAFT);
    });

    it('should throw BadRequestException if client not found', async () => {
      clientsRepository.findOne.mockResolvedValue(null);

      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        'Cliente no encontrado',
      );
    });

    it('should throw BadRequestException if warehouse not found', async () => {
      clientsRepository.findOne.mockResolvedValue(mockClient);
      warehousesRepository.findOne.mockResolvedValue(null);

      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        'Almacén no encontrado',
      );
    });

    it('should throw BadRequestException if product not found', async () => {
      clientsRepository.findOne.mockResolvedValue(mockClient);
      warehousesRepository.findOne.mockResolvedValue(mockWarehouse);
      productsRepository.findOne.mockResolvedValue(null);

      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        'Producto product-1 no encontrado',
      );
    });

    it('should handle multiple items', async () => {
      setupSuccessfulCreate();
      const multiItemDto = {
        ...validDto,
        items: [
          { productId: 'product-1', quantity: 10, unitPrice: 100, taxRate: 16 },
          { productId: 'product-2', quantity: 5, unitPrice: 200, taxRate: 16 },
        ],
      };

      const result = await service.create(multiItemDto, 'tenant-1');

      // 10*100 + 5*200 = 1,000 + 1,000 = 2,000
      expect(result.materialsSubtotal).toBe(2000);
    });

    it('should apply discounts correctly', async () => {
      setupSuccessfulCreate();
      const discountDto = { ...validDto, discount: 1000 };

      const result = await service.create(discountDto, 'tenant-1');

      expect(result.discount).toBe(1000);
      // Total: 21,060 - 1,000 = 20,060
      expect(result.total).toBe(20060);
    });

    it('should work without laborItems', async () => {
      setupSuccessfulCreate();
      const noLaborDto = { ...validDto, laborItems: undefined };

      const result = await service.create(noLaborDto, 'tenant-1');

      expect(result.laborSubtotal).toBe(0);
    });

    it('should default warrantyMonths to 12', async () => {
      setupSuccessfulCreate();
      const noWarrantyDto = { ...validDto, warrantyMonths: undefined };

      const result = await service.create(noWarrantyDto, 'tenant-1');

      expect(result.warrantyMonths).toBe(12);
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should filter by tenantId', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      budgetsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll({}, 'tenant-1');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'budget.tenantId = :tenantId',
        { tenantId: 'tenant-1' },
      );
    });

    it('should apply pagination', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      budgetsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll({ page: 2, limit: 10 }, 'tenant-1');

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should return paginated response', async () => {
      const mockData = [{ id: 'budget-1' }, { id: 'budget-2' }];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockData, 2]),
      };

      budgetsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll({}, 'tenant-1');

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return budget by id', async () => {
      const mockBudget = {
        id: 'budget-1',
        tenantId: 'tenant-1',
        budgetNumber: 'BUD-202609-00001',
      };

      budgetsRepository.findOne.mockResolvedValue(mockBudget);

      const result = await service.findOne('budget-1', 'tenant-1');

      expect(result).toEqual(mockBudget);
    });

    it('should throw NotFoundException if budget not found', async () => {
      budgetsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('budget-1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // FIND BY NUMBER
  // ============================================
  describe('findByNumber', () => {
    it('should return budget by number', async () => {
      const mockBudget = {
        id: 'budget-1',
        budgetNumber: 'BUD-202609-00001',
      };

      budgetsRepository.findOne.mockResolvedValue(mockBudget);

      const result = await service.findByNumber('BUD-202609-00001', 'tenant-1');

      expect(result).toEqual(mockBudget);
    });

    it('should throw NotFoundException if not found', async () => {
      budgetsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByNumber('BUD-999999', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // SEND
  // ============================================
  describe('send', () => {
    it('should change status from draft to sent', async () => {
      const mockBudget = {
        id: 'budget-1',
        status: BudgetStatus.DRAFT,
        validUntil: new Date(Date.now() + 86400000),
      };

      budgetsRepository.findOne.mockResolvedValue(mockBudget);
      budgetsRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.send('budget-1', 'tenant-1');

      expect(result.status).toBe(BudgetStatus.SENT);
      expect(result.sentAt).toBeDefined();
    });

    it('should throw BadRequestException if not in draft', async () => {
      const mockBudget = {
        id: 'budget-1',
        status: BudgetStatus.APPROVED,
        validUntil: new Date(Date.now() + 86400000),
      };

      budgetsRepository.findOne.mockResolvedValue(mockBudget);

      await expect(service.send('budget-1', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if budget expired', async () => {
      const mockBudget = {
        id: 'budget-1',
        status: BudgetStatus.DRAFT,
        validUntil: new Date(Date.now() - 86400000),
      };

      budgetsRepository.findOne.mockResolvedValue(mockBudget);

      await expect(service.send('budget-1', 'tenant-1')).rejects.toThrow(
        'El presupuesto ya expiró',
      );
    });
  });

  // ============================================
  // APPROVE
  // ============================================
  describe('approve', () => {
    it('should change status from sent to approved', async () => {
      const mockBudget = {
        id: 'budget-1',
        status: BudgetStatus.SENT,
      };

      budgetsRepository.findOne.mockResolvedValue(mockBudget);
      budgetsRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.approve('budget-1', 'tenant-1', 'user-1');

      expect(result.status).toBe(BudgetStatus.APPROVED);
      expect(result.approvedAt).toBeDefined();
      expect(result.approvedById).toBe('user-1');
    });

    it('should throw BadRequestException if not sent', async () => {
      const mockBudget = { id: 'budget-1', status: BudgetStatus.DRAFT };

      budgetsRepository.findOne.mockResolvedValue(mockBudget);

      await expect(
        service.approve('budget-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // REJECT
  // ============================================
  describe('reject', () => {
    it('should change status from sent to rejected', async () => {
      const mockBudget = {
        id: 'budget-1',
        status: BudgetStatus.SENT,
        notes: null,
      };

      budgetsRepository.findOne.mockResolvedValue(mockBudget);
      budgetsRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.reject('budget-1', 'Precio alto', 'tenant-1');

      expect(result.status).toBe(BudgetStatus.REJECTED);
      expect(result.notes).toContain('Precio alto');
      expect(result.rejectedAt).toBeDefined();
    });

    it('should throw BadRequestException if not sent', async () => {
      const mockBudget = { id: 'budget-1', status: BudgetStatus.DRAFT };

      budgetsRepository.findOne.mockResolvedValue(mockBudget);

      await expect(
        service.reject('budget-1', 'reason', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // CANCEL
  // ============================================
  describe('cancel', () => {
    it('should cancel a draft budget', async () => {
      const mockBudget = { id: 'budget-1', status: BudgetStatus.DRAFT };

      budgetsRepository.findOne.mockResolvedValue(mockBudget);
      budgetsRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.cancel('budget-1', 'tenant-1');

      expect(result.status).toBe(BudgetStatus.CANCELLED);
    });

    it('should throw BadRequestException if already converted', async () => {
      const mockBudget = { id: 'budget-1', status: BudgetStatus.CONVERTED };

      budgetsRepository.findOne.mockResolvedValue(mockBudget);

      await expect(service.cancel('budget-1', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove draft budget', async () => {
      const mockBudget = { id: 'budget-1', status: BudgetStatus.DRAFT };

      budgetsRepository.findOne.mockResolvedValue(mockBudget);
      budgetsRepository.remove.mockResolvedValue(mockBudget);

      const result = await service.remove('budget-1', 'tenant-1');

      expect(result).toHaveProperty('message', 'Presupuesto eliminado');
    });

    it('should throw BadRequestException if not draft', async () => {
      const mockBudget = { id: 'budget-1', status: BudgetStatus.APPROVED };

      budgetsRepository.findOne.mockResolvedValue(mockBudget);

      await expect(service.remove('budget-1', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================
  // STATS
  // ============================================
  describe('getStats', () => {
    it('should return budget statistics', async () => {
      budgetsRepository.count.mockResolvedValue(10);

      // Mock para byStatus
      const byStatusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'draft', count: '3', total: '30000' },
          { status: 'approved', count: '5', total: '50000' },
        ]),
      };

      // Mock para totals
      const totalsQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalAll: '100000',
          avgTotal: '10000',
        }),
      };

      // Mock para approvedTotals
      const approvedQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '50000' }),
      };

      // Mock para conversionRate
      const rateQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ rate: '50' }),
      };

      // Mock para expiringSoon (getCount)
      const expiringQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      };

      // Configurar el orden de llamadas
      budgetsRepository.createQueryBuilder
        .mockReturnValueOnce(byStatusQb)
        .mockReturnValueOnce(totalsQb)
        .mockReturnValueOnce(approvedQb)
        .mockReturnValueOnce(rateQb)
        .mockReturnValueOnce(expiringQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(10);
      expect(result.totalValue).toBe(100000);
      expect(result.avgValue).toBe(10000);
      expect(result.approvedValue).toBe(50000);
      expect(result.conversionRate).toBe(50);
      expect(result.expiringSoon).toBe(2);
    });
  });
});