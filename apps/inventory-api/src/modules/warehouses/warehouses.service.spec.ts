// apps/inventory-api/src/modules/warehouses/warehouses.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { WarehousesService } from './warehouses.service';
import { Warehouse } from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockWarehousesRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('WarehousesService', () => {
  let service: WarehousesService;
  let warehousesRepository: typeof mockWarehousesRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehousesService,
        {
          provide: getRepositoryToken(Warehouse),
          useValue: mockWarehousesRepository,
        },
      ],
    }).compile();

    service = module.get<WarehousesService>(WarehousesService);
    warehousesRepository = module.get(getRepositoryToken(Warehouse));
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.values(mockWarehousesRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // HELPERS
  // ============================================
  const mockWarehouse = (overrides: Partial<Warehouse> = {}): Warehouse =>
    ({
      id: 'wh-1',
      tenantId: 'tenant-1',
      name: 'Almacén Central',
      code: 'ALM-CENTRAL',
      description: null,
      address: null,
      city: 'Madrid',
      state: 'Madrid',
      postalCode: null,
      country: 'España',
      phone: null,
      email: null,
      managerName: null,
      capacity: 0,
      isActive: true,
      isDefault: false,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Warehouse;

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto = {
      name: 'Almacén Central',
      code: 'ALM-CENTRAL',
    };

    it('should create warehouse with unique code', async () => {
      warehousesRepository.findOne.mockResolvedValue(null);
      warehousesRepository.count.mockResolvedValue(1);
      warehousesRepository.create.mockImplementation((data) => data);
      warehousesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'wh-1' }),
      );

      const result = await service.create(validDto, 'tenant-1');

      expect(warehousesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Almacén Central',
          code: 'ALM-CENTRAL',
          tenantId: 'tenant-1',
        }),
      );
      expect(result.id).toBe('wh-1');
    });

    it('should check code uniqueness per tenant', async () => {
      warehousesRepository.findOne.mockResolvedValue(null);
      warehousesRepository.count.mockResolvedValue(1);
      warehousesRepository.create.mockImplementation((data) => data);
      warehousesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'wh-1' }),
      );

      await service.create(validDto, 'tenant-1');

      expect(warehousesRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'ALM-CENTRAL', tenantId: 'tenant-1' },
      });
    });

    it('should throw ConflictException if code exists', async () => {
      warehousesRepository.findOne.mockResolvedValue(mockWarehouse());

      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        'El código "ALM-CENTRAL" ya existe en tu empresa',
      );
    });

    it('should mark first warehouse as default', async () => {
      warehousesRepository.findOne.mockResolvedValue(null);
      warehousesRepository.count.mockResolvedValue(0); // primer almacén
      warehousesRepository.create.mockImplementation((data) => data);
      warehousesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'wh-1' }),
      );

      await service.create(validDto, 'tenant-1');

      expect(warehousesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isDefault: true }),
      );
    });

    it('should NOT mark second warehouse as default by default', async () => {
      warehousesRepository.findOne.mockResolvedValue(null);
      warehousesRepository.count.mockResolvedValue(1); // ya hay otro
      warehousesRepository.create.mockImplementation((data) => data);
      warehousesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'wh-1' }),
      );

      await service.create(validDto, 'tenant-1');

      expect(warehousesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isDefault: false }),
      );
    });

    it('should unset other defaults when isDefault is true', async () => {
      warehousesRepository.findOne.mockResolvedValue(null);
      warehousesRepository.count.mockResolvedValue(2);
      warehousesRepository.create.mockImplementation((data) => data);
      warehousesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'wh-1' }),
      );

      await service.create({ ...validDto, isDefault: true }, 'tenant-1');

      expect(warehousesRepository.update).toHaveBeenCalledWith(
        { tenantId: 'tenant-1', isDefault: true },
        { isDefault: false },
      );
    });

    it('should NOT call update if isDefault not provided', async () => {
      warehousesRepository.findOne.mockResolvedValue(null);
      warehousesRepository.count.mockResolvedValue(2);
      warehousesRepository.create.mockImplementation((data) => data);
      warehousesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'wh-1' }),
      );

      await service.create(validDto, 'tenant-1');

      expect(warehousesRepository.update).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should return only active warehouses by default', async () => {
      warehousesRepository.find.mockResolvedValue([]);

      await service.findAll('tenant-1');

      expect(warehousesRepository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isActive: true },
        order: { isDefault: 'DESC', name: 'ASC' },
      });
    });

    it('should include inactive when includeInactive is true', async () => {
      warehousesRepository.find.mockResolvedValue([]);

      await service.findAll('tenant-1', true);

      expect(warehousesRepository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        order: { isDefault: 'DESC', name: 'ASC' },
      });
    });

    it('should order by isDefault DESC then name ASC', async () => {
      warehousesRepository.find.mockResolvedValue([]);

      await service.findAll('tenant-1');

      const call = warehousesRepository.find.mock.calls[0][0];
      expect(call.order).toEqual({ isDefault: 'DESC', name: 'ASC' });
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return warehouse by id and tenant', async () => {
      const wh = mockWarehouse();
      warehousesRepository.findOne.mockResolvedValue(wh);

      const result = await service.findOne('wh-1', 'tenant-1');

      expect(result).toEqual(wh);
      expect(warehousesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'wh-1', tenantId: 'tenant-1' },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      warehousesRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('wh-1', 'tenant-1')).rejects.toThrow(
        'Almacén wh-1 no encontrado',
      );
    });
  });

  // ============================================
  // FIND BY CODE
  // ============================================
  describe('findByCode', () => {
    it('should return warehouse by code', async () => {
      const wh = mockWarehouse();
      warehousesRepository.findOne.mockResolvedValue(wh);

      const result = await service.findByCode('ALM-CENTRAL', 'tenant-1');

      expect(result).toEqual(wh);
    });

    it('should throw NotFoundException if not found', async () => {
      warehousesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByCode('NO-EXISTE', 'tenant-1'),
      ).rejects.toThrow('Almacén "NO-EXISTE" no encontrado');
    });
  });

  // ============================================
  // GET DEFAULT
  // ============================================
  describe('getDefault', () => {
    it('should return default active warehouse', async () => {
      const wh = mockWarehouse({ isDefault: true });
      warehousesRepository.findOne.mockResolvedValue(wh);

      const result = await service.getDefault('tenant-1');

      expect(result).toEqual(wh);
      expect(warehousesRepository.findOne).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isDefault: true, isActive: true },
      });
    });

    it('should throw NotFoundException if no default', async () => {
      warehousesRepository.findOne.mockResolvedValue(null);

      await expect(service.getDefault('tenant-1')).rejects.toThrow(
        'No hay almacén por defecto',
      );
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should update warehouse fields', async () => {
      const wh = mockWarehouse();
      warehousesRepository.findOne.mockResolvedValue(wh);
      warehousesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update(
        'wh-1',
        { name: 'Nuevo nombre' },
        'tenant-1',
      );

      expect(result.name).toBe('Nuevo nombre');
    });

    it('should unset other defaults when isDefault changes to true', async () => {
      const wh = mockWarehouse({ isDefault: false });
      warehousesRepository.findOne.mockResolvedValue(wh);
      warehousesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('wh-1', { isDefault: true }, 'tenant-1');

      expect(warehousesRepository.update).toHaveBeenCalledWith(
        { tenantId: 'tenant-1', isDefault: true },
        { isDefault: false },
      );
    });

    it('should NOT unset defaults if already default', async () => {
      const wh = mockWarehouse({ isDefault: true });
      warehousesRepository.findOne.mockResolvedValue(wh);
      warehousesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('wh-1', { isDefault: true }, 'tenant-1');

      expect(warehousesRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found', async () => {
      warehousesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('wh-1', { name: 'X' }, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // SET DEFAULT
  // ============================================
  describe('setDefault', () => {
    it('should unset all defaults then set this one', async () => {
      const wh = mockWarehouse({ isDefault: false });
      warehousesRepository.findOne.mockResolvedValue(wh);
      warehousesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.setDefault('wh-1', 'tenant-1');

      expect(warehousesRepository.update).toHaveBeenCalledWith(
        { tenantId: 'tenant-1' },
        { isDefault: false },
      );
      expect(result.isDefault).toBe(true);
      expect(warehousesRepository.save).toHaveBeenCalledWith(wh);
    });

    it('should throw NotFoundException if not found', async () => {
      warehousesRepository.findOne.mockResolvedValue(null);

      await expect(service.setDefault('wh-1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove non-default warehouse', async () => {
      const wh = mockWarehouse({ isDefault: false });
      warehousesRepository.findOne.mockResolvedValue(wh);
      warehousesRepository.remove.mockResolvedValue(wh);

      const result = await service.remove('wh-1', 'tenant-1');

      expect(result).toEqual({ message: 'Almacén eliminado' });
      expect(warehousesRepository.remove).toHaveBeenCalledWith(wh);
    });

    it('should throw BadRequestException if default warehouse', async () => {
      warehousesRepository.findOne.mockResolvedValue(
        mockWarehouse({ isDefault: true }),
      );

      await expect(service.remove('wh-1', 'tenant-1')).rejects.toThrow(
        'No se puede eliminar el almacén por defecto',
      );
    });

    it('should not call remove if default', async () => {
      warehousesRepository.findOne.mockResolvedValue(
        mockWarehouse({ isDefault: true }),
      );

      await expect(service.remove('wh-1', 'tenant-1')).rejects.toThrow();

      expect(warehousesRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found', async () => {
      warehousesRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('wh-1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return total, active, inactive, defaultWarehouse', async () => {
      warehousesRepository.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(4);
      warehousesRepository.findOne.mockResolvedValue(
        mockWarehouse({ name: 'Almacén Central', isDefault: true }),
      );

      const result = await service.getStats('tenant-1');

      expect(result).toEqual({
        total: 5,
        active: 4,
        inactive: 1,
        defaultWarehouse: 'Almacén Central',
      });
    });

    it('should return null defaultWarehouse if no default', async () => {
      warehousesRepository.count.mockResolvedValue(0);
      warehousesRepository.findOne.mockResolvedValue(null);

      const result = await service.getStats('tenant-1');

      expect(result.defaultWarehouse).toBeNull();
    });

    it('should filter counts by tenantId', async () => {
      warehousesRepository.count.mockResolvedValue(0);
      warehousesRepository.findOne.mockResolvedValue(null);

      await service.getStats('tenant-1');

      expect(warehousesRepository.count).toHaveBeenNthCalledWith(1, {
        where: { tenantId: 'tenant-1' },
      });
      expect(warehousesRepository.count).toHaveBeenNthCalledWith(2, {
        where: { tenantId: 'tenant-1', isActive: true },
      });
    });
  });
});