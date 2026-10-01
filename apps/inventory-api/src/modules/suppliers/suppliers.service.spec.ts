// apps/inventory-api/src/modules/suppliers/suppliers.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { SuppliersService } from './suppliers.service';
import { Supplier } from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockSuppliersRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('SuppliersService', () => {
  let service: SuppliersService;
  let suppliersRepository: typeof mockSuppliersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSuppliersRepository,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    suppliersRepository = module.get(getRepositoryToken(Supplier));
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.values(mockSuppliersRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // HELPERS
  // ============================================
  const mockSupplier = (overrides: Partial<Supplier> = {}): Supplier =>
    ({
      id: 'sup-1',
      tenantId: 'tenant-1',
      name: 'Distribuidora Apple',
      code: 'PROV-001',
      legalName: null,
      taxId: null,
      description: null,
      email: 'contacto@apple.com',
      phone: null,
      website: null,
      address: null,
      city: 'Madrid',
      state: 'Madrid',
      postalCode: null,
      country: 'España',
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      contactPosition: null,
      paymentTerms: 30,
      creditLimit: 0,
      currency: 'USD',
      isActive: true,
      isPreferred: false,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Supplier;

  const buildQueryBuilder = (data: any[], total?: number) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([data, total ?? data.length]),
    getRawMany: jest.fn().mockResolvedValue([]),
  });

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto = {
      name: 'Distribuidora Apple',
      code: 'PROV-001',
    };

    it('should create supplier with unique code', async () => {
      suppliersRepository.findOne.mockResolvedValue(null);
      suppliersRepository.create.mockImplementation((data) => data);
      suppliersRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'sup-1' }),
      );

      const result = await service.create(validDto, 'tenant-1');

      expect(suppliersRepository.create).toHaveBeenCalledWith({
        ...validDto,
        tenantId: 'tenant-1',
      });
      expect(result.id).toBe('sup-1');
    });

    it('should check code uniqueness per tenant', async () => {
      suppliersRepository.findOne.mockResolvedValue(null);
      suppliersRepository.create.mockImplementation((data) => data);
      suppliersRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'sup-1' }),
      );

      await service.create(validDto, 'tenant-1');

      expect(suppliersRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'PROV-001', tenantId: 'tenant-1' },
      });
    });

    it('should throw ConflictException if code exists', async () => {
      suppliersRepository.findOne.mockResolvedValue(mockSupplier());

      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        'El código "PROV-001" ya existe en tu empresa',
      );
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should filter by tenantId', async () => {
      const qb = buildQueryBuilder([]);
      suppliersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.where).toHaveBeenCalledWith('supplier.tenantId = :tenantId', {
        tenantId: 'tenant-1',
      });
    });

    it('should apply pagination', async () => {
      const qb = buildQueryBuilder([]);
      suppliersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 3, limit: 5 }, 'tenant-1');

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should apply search across name, code, email', async () => {
      const qb = buildQueryBuilder([]);
      suppliersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'Apple' }, 'tenant-1');

      const searchCall = qb.andWhere.mock.calls.find((call) =>
        call[0].includes('ILIKE'),
      );
      expect(searchCall![0]).toContain('supplier.name');
      expect(searchCall![0]).toContain('supplier.code');
      expect(searchCall![0]).toContain('supplier.email');
      expect(searchCall![1]).toEqual({ search: '%Apple%' });
    });

    it('should filter by city and country', async () => {
      const qb = buildQueryBuilder([]);
      suppliersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { city: 'Madrid', country: 'España' },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith('supplier.city = :city', {
        city: 'Madrid',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('supplier.country = :country', {
        country: 'España',
      });
    });

    it('should apply isActive and isPreferred filters', async () => {
      const qb = buildQueryBuilder([]);
      suppliersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { isActive: true, isPreferred: true },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'supplier.isActive = :isActive',
        { isActive: true },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'supplier.isPreferred = :isPreferred',
        { isPreferred: true },
      );
    });

    it('should NOT apply isActive if undefined', async () => {
      const qb = buildQueryBuilder([]);
      suppliersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      const activeCalls = qb.andWhere.mock.calls.filter((call) =>
        call[0].includes('isActive'),
      );
      expect(activeCalls).toHaveLength(0);
    });

    it('should order by isPreferred DESC then name ASC', async () => {
      const qb = buildQueryBuilder([]);
      suppliersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.orderBy).toHaveBeenCalledWith('supplier.isPreferred', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('supplier.name', 'ASC');
    });

    it('should return paginated response with meta', async () => {
      const suppliers = [mockSupplier()];
      const qb = buildQueryBuilder(suppliers, 45);
      suppliersRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 2, limit: 20 }, 'tenant-1');

      expect(result.meta.total).toBe(45);
      expect(result.meta.totalPages).toBe(3);
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return supplier by id and tenant', async () => {
      const sup = mockSupplier();
      suppliersRepository.findOne.mockResolvedValue(sup);

      const result = await service.findOne('sup-1', 'tenant-1');

      expect(result).toEqual(sup);
      expect(suppliersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'sup-1', tenantId: 'tenant-1' },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      suppliersRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('sup-1', 'tenant-1')).rejects.toThrow(
        'Proveedor sup-1 no encontrado',
      );
    });
  });

  // ============================================
  // FIND BY CODE
  // ============================================
  describe('findByCode', () => {
    it('should return supplier by code', async () => {
      const sup = mockSupplier();
      suppliersRepository.findOne.mockResolvedValue(sup);

      const result = await service.findByCode('PROV-001', 'tenant-1');

      expect(result).toEqual(sup);
    });

    it('should throw NotFoundException if not found', async () => {
      suppliersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByCode('NO-EXISTE', 'tenant-1'),
      ).rejects.toThrow('Proveedor "NO-EXISTE" no encontrado');
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should update supplier fields', async () => {
      const sup = mockSupplier();
      suppliersRepository.findOne.mockResolvedValue(sup);
      suppliersRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update(
        'sup-1',
        { name: 'Nuevo nombre' },
        'tenant-1',
      );

      expect(result.name).toBe('Nuevo nombre');
    });

    it('should throw NotFoundException if not found', async () => {
      suppliersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('sup-1', { name: 'X' }, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove supplier', async () => {
      const sup = mockSupplier();
      suppliersRepository.findOne.mockResolvedValue(sup);
      suppliersRepository.remove.mockResolvedValue(sup);

      const result = await service.remove('sup-1', 'tenant-1');

      expect(result).toEqual({ message: 'Proveedor eliminado' });
      expect(suppliersRepository.remove).toHaveBeenCalledWith(sup);
    });

    it('should throw NotFoundException if not found', async () => {
      suppliersRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('sup-1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return full statistics', async () => {
      suppliersRepository.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(18)
        .mockResolvedValueOnce(5);

      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { country: 'España', count: '10' },
          { country: 'México', count: '5' },
        ]),
      };
      suppliersRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(20);
      expect(result.active).toBe(18);
      expect(result.inactive).toBe(2);
      expect(result.preferred).toBe(5);
      expect(result.byCountry).toHaveLength(2);
    });

    it('should return zeros when no suppliers', async () => {
      suppliersRepository.count.mockResolvedValue(0);

      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      suppliersRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
      expect(result.preferred).toBe(0);
    });

    it('should filter byCountry with IS NOT NULL', async () => {
      suppliersRepository.count.mockResolvedValue(0);

      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      suppliersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.getStats('tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        'supplier.country IS NOT NULL',
      );
    });

    it('should call count with correct where clauses', async () => {
      suppliersRepository.count.mockResolvedValue(0);

      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      suppliersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.getStats('tenant-1');

      expect(suppliersRepository.count).toHaveBeenNthCalledWith(1, {
        where: { tenantId: 'tenant-1' },
      });
      expect(suppliersRepository.count).toHaveBeenNthCalledWith(2, {
        where: { tenantId: 'tenant-1', isActive: true },
      });
      expect(suppliersRepository.count).toHaveBeenNthCalledWith(3, {
        where: { tenantId: 'tenant-1', isPreferred: true },
      });
    });
  });
});