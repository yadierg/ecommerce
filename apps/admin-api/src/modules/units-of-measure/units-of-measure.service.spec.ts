// apps/admin-api/src/modules/units-of-measure/units-of-measure.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';

import { UnitsOfMeasureService } from './units-of-measure.service';
import { UnitOfMeasure, UnitType, Product } from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockUnitsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockProductsRepository = {
  count: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('UnitsOfMeasureService', () => {
  let service: UnitsOfMeasureService;
  let unitsRepository: typeof mockUnitsRepository;
  let productsRepository: typeof mockProductsRepository;

  const tenantId = 'tenant-1';
  const otherTenantId = 'tenant-2';
  const systemUnitId = 'sys-unit-1';
  const customUnitId = 'custom-unit-1';
  const userId = 'user-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsOfMeasureService,
        {
          provide: getRepositoryToken(UnitOfMeasure),
          useValue: mockUnitsRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductsRepository,
        },
      ],
    }).compile();

    service = module.get<UnitsOfMeasureService>(UnitsOfMeasureService);
    unitsRepository = module.get(getRepositoryToken(UnitOfMeasure));
    productsRepository = module.get(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
    [mockUnitsRepository, mockProductsRepository].forEach((repo) => {
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
  const mockSystemUnit = (overrides: Partial<UnitOfMeasure> = {}): UnitOfMeasure =>
    ({
      id: systemUnitId,
      tenantId: null,
      name: 'Unidad',
      abbreviation: 'unit',
      nameEn: 'Unit',
      description: 'Unidad genérica',
      type: UnitType.UNIT,
      decimalPlaces: 0,
      isActive: true,
      isSystem: true,
      order: 1,
      createdById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as UnitOfMeasure;

  const mockCustomUnit = (overrides: Partial<UnitOfMeasure> = {}): UnitOfMeasure =>
    ({
      id: customUnitId,
      tenantId,
      name: 'Kilo custom',
      abbreviation: 'kc',
      nameEn: 'Kilo custom',
      description: null,
      type: UnitType.WEIGHT,
      decimalPlaces: 2,
      isActive: true,
      isSystem: false,
      order: 10,
      createdById: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as UnitOfMeasure;

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
      name: 'Pulgada',
      abbreviation: 'in',
      nameEn: 'Inch',
      type: UnitType.LENGTH,
      decimalPlaces: 2,
    };

    it('should create a custom unit for the tenant', async () => {
      unitsRepository.findOne.mockResolvedValue(null);
      unitsRepository.create.mockImplementation((data) => data);
      unitsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: customUnitId }),
      );

      const result = await service.create(validDto, tenantId, userId);

      expect(unitsRepository.findOne).toHaveBeenCalledWith({
        where: [
          { abbreviation: 'in', tenantId },
          { abbreviation: 'in', tenantId: IsNull() },
        ],
      });
      expect(unitsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validDto,
          tenantId,
          createdById: userId,
        }),
      );
      expect(result.id).toBe(customUnitId);
    });

    it('should throw ConflictException if abbreviation exists in tenant', async () => {
      unitsRepository.findOne.mockResolvedValue(
        mockCustomUnit({ abbreviation: 'in' }),
      );

      await expect(service.create(validDto, tenantId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(validDto, tenantId)).rejects.toThrow(
        'La unidad "in" ya existe',
      );
    });

    it('should throw ConflictException if abbreviation exists in system units', async () => {
      unitsRepository.findOne.mockResolvedValue(
        mockSystemUnit({ abbreviation: 'in' }),
      );

      await expect(service.create(validDto, tenantId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should work without userId (createdById = undefined)', async () => {
      unitsRepository.findOne.mockResolvedValue(null);
      unitsRepository.create.mockImplementation((data) => data);
      unitsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: customUnitId }),
      );

      await service.create(validDto, tenantId);

      expect(unitsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdById: undefined }),
      );
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should list units of tenant + system with pagination', async () => {
      const data = [mockSystemUnit(), mockCustomUnit()];
      const qb = buildQueryBuilder(data, 2);
      unitsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({}, tenantId);

      expect(qb.where).toHaveBeenCalledWith(
        '(unit.tenantId = :tenantId OR unit.tenantId IS NULL)',
        { tenantId },
      );
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should apply pagination with default page=1 limit=50', async () => {
      const qb = buildQueryBuilder([]);
      unitsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, tenantId);

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
    });

    it('should apply custom pagination', async () => {
      const qb = buildQueryBuilder([]);
      unitsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 3, limit: 10 }, tenantId);

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('should apply search filter (name, abbreviation, nameEn)', async () => {
      const qb = buildQueryBuilder([]);
      unitsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'metro' }, tenantId);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(unit.name ILIKE :search OR unit.abbreviation ILIKE :search OR unit.nameEn ILIKE :search)',
        { search: '%metro%' },
      );
    });

    it('should apply type filter', async () => {
      const qb = buildQueryBuilder([]);
      unitsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ type: UnitType.LENGTH }, tenantId);

      expect(qb.andWhere).toHaveBeenCalledWith('unit.type = :type', {
        type: UnitType.LENGTH,
      });
    });

    it('should apply isActive filter', async () => {
      const qb = buildQueryBuilder([]);
      unitsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ isActive: false }, tenantId);

      expect(qb.andWhere).toHaveBeenCalledWith('unit.isActive = :isActive', {
        isActive: false,
      });
    });

    it('should NOT apply isActive filter if undefined', async () => {
      const qb = buildQueryBuilder([]);
      unitsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, tenantId);

      const isActiveCall = qb.andWhere.mock.calls.find((call) =>
        call[0].includes('unit.isActive'),
      );
      expect(isActiveCall).toBeUndefined();
    });

    it('should order by order ASC then name ASC', async () => {
      const qb = buildQueryBuilder([]);
      unitsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, tenantId);

      expect(qb.orderBy).toHaveBeenCalledWith('unit.order', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('unit.name', 'ASC');
    });
  });

  // ============================================
  // FIND ACTIVE
  // ============================================
  describe('findActive', () => {
    it('should return active units of tenant + system', async () => {
      const units = [mockSystemUnit(), mockCustomUnit()];
      unitsRepository.find.mockResolvedValue(units);

      const result = await service.findActive(tenantId);

      expect(unitsRepository.find).toHaveBeenCalledWith({
        where: [
          { tenantId, isActive: true },
          { tenantId: IsNull(), isActive: true },
        ],
        order: { order: 'ASC', name: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no active units', async () => {
      unitsRepository.find.mockResolvedValue([]);

      const result = await service.findActive(tenantId);

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // FIND BY TYPE
  // ============================================
  describe('findByType', () => {
    it('should filter by type + active + tenant/system', async () => {
      unitsRepository.find.mockResolvedValue([mockSystemUnit()]);

      await service.findByType(tenantId, UnitType.UNIT);

      expect(unitsRepository.find).toHaveBeenCalledWith({
        where: [
          { tenantId, type: UnitType.UNIT, isActive: true },
          { tenantId: IsNull(), type: UnitType.UNIT, isActive: true },
        ],
        order: { order: 'ASC', name: 'ASC' },
      });
    });

    it('should return units of requested type', async () => {
      const units = [mockSystemUnit({ type: UnitType.LENGTH })];
      unitsRepository.find.mockResolvedValue(units);

      const result = await service.findByType(tenantId, UnitType.LENGTH);

      expect(result).toEqual(units);
    });

    it('should return empty array if no units of type', async () => {
      unitsRepository.find.mockResolvedValue([]);

      const result = await service.findByType(tenantId, UnitType.AREA);

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return system unit', async () => {
      unitsRepository.findOne.mockResolvedValue(mockSystemUnit());

      const result = await service.findOne(systemUnitId, tenantId);

      expect(unitsRepository.findOne).toHaveBeenCalledWith({
        where: [
          { id: systemUnitId, tenantId },
          { id: systemUnitId, tenantId: IsNull() },
        ],
      });
      expect(result.isSystem).toBe(true);
    });

    it('should return custom unit of same tenant', async () => {
      unitsRepository.findOne.mockResolvedValue(mockCustomUnit());

      const result = await service.findOne(customUnitId, tenantId);

      expect(result.tenantId).toBe(tenantId);
    });

    it('should throw NotFoundException if unit does not exist', async () => {
      unitsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('no-existe', tenantId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('no-existe', tenantId)).rejects.toThrow(
        'Unidad no-existe no encontrada',
      );
    });

    it('should throw NotFoundException if unit belongs to another tenant', async () => {
      unitsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(customUnitId, otherTenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

    // ============================================
  // UPDATE (UpdateUnitOfMeasureDto NO permite cambiar abbreviation)
  // ============================================
  describe('update', () => {
    it('should update a custom unit (name, nameEn, description)', async () => {
      unitsRepository.findOne.mockResolvedValue(mockCustomUnit());
      unitsRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.update(customUnitId, {
        name: 'Nuevo nombre',
        description: 'Nueva descripción',
      }, tenantId);

      expect(result.name).toBe('Nuevo nombre');
      expect(result.description).toBe('Nueva descripción');
      expect(unitsRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when editing a system unit', async () => {
      unitsRepository.findOne.mockResolvedValue(mockSystemUnit());

      await expect(
        service.update(systemUnitId, { name: 'Hackeada' }, tenantId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(systemUnitId, { name: 'Hackeada' }, tenantId),
      ).rejects.toThrow('No se pueden editar unidades del sistema');
    });

    it('should throw NotFoundException if unit does not exist', async () => {
      unitsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('no-existe', { name: 'X' }, tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if unit belongs to another tenant', async () => {
      unitsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(customUnitId, { name: 'X' }, otherTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // TOGGLE ACTIVE
  // ============================================
  describe('toggleActive', () => {
    it('should deactivate an active custom unit', async () => {
      unitsRepository.findOne.mockResolvedValue(mockCustomUnit({ isActive: true }));
      unitsRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.toggleActive(customUnitId, tenantId);

      expect(result.isActive).toBe(false);
    });

    it('should activate an inactive custom unit', async () => {
      unitsRepository.findOne.mockResolvedValue(mockCustomUnit({ isActive: false }));
      unitsRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.toggleActive(customUnitId, tenantId);

      expect(result.isActive).toBe(true);
    });

    it('should throw BadRequestException when toggling a system unit', async () => {
      unitsRepository.findOne.mockResolvedValue(mockSystemUnit());

      await expect(service.toggleActive(systemUnitId, tenantId)).rejects.toThrow(
        'No se pueden desactivar unidades del sistema',
      );
    });

    it('should throw NotFoundException if unit does not exist', async () => {
      unitsRepository.findOne.mockResolvedValue(null);

      await expect(service.toggleActive('no-existe', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove a custom unit with no products', async () => {
      unitsRepository.findOne.mockResolvedValue(mockCustomUnit());
      productsRepository.count.mockResolvedValue(0);
      unitsRepository.remove.mockResolvedValue(mockCustomUnit());

      const result = await service.remove(customUnitId, tenantId);

      expect(productsRepository.count).toHaveBeenCalledWith({
        where: { unitOfMeasureId: customUnitId },
      });
      expect(unitsRepository.remove).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Unidad eliminada' });
    });

    it('should throw BadRequestException when removing a system unit', async () => {
      unitsRepository.findOne.mockResolvedValue(mockSystemUnit());

      await expect(service.remove(systemUnitId, tenantId)).rejects.toThrow(
        'No se pueden eliminar unidades del sistema',
      );
    });

    it('should throw ConflictException when products are using the unit', async () => {
      unitsRepository.findOne.mockResolvedValue(mockCustomUnit());
      productsRepository.count.mockResolvedValue(3);

      await expect(service.remove(customUnitId, tenantId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.remove(customUnitId, tenantId)).rejects.toThrow(
        /3 producto\(s\)/,
      );
    });

    it('should throw NotFoundException if unit does not exist', async () => {
      unitsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('no-existe', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should NOT remove from repository if products are using the unit', async () => {
      unitsRepository.findOne.mockResolvedValue(mockCustomUnit());
      productsRepository.count.mockResolvedValue(3);

      await expect(service.remove(customUnitId, tenantId)).rejects.toThrow();

      expect(unitsRepository.remove).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return full statistics (total, active, inactive, system, custom, byType)', async () => {
      // Llamadas en orden: total, active, system, custom
      unitsRepository.count
        .mockResolvedValueOnce(30) // total
        .mockResolvedValueOnce(25) // active
        .mockResolvedValueOnce(10) // system
        .mockResolvedValueOnce(20); // custom

      const byTypeQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { type: 'unit', count: '7' },
          { type: 'length', count: '5' },
        ]),
      };
      unitsRepository.createQueryBuilder.mockReturnValue(byTypeQb);

      const result = await service.getStats(tenantId);

      expect(result.total).toBe(30);
      expect(result.active).toBe(25);
      expect(result.inactive).toBe(5);
      expect(result.system).toBe(10);
      expect(result.custom).toBe(20);
      expect(result.byType).toHaveLength(2);
    });

    it('should return zeros when no units', async () => {
      unitsRepository.count.mockResolvedValue(0);

      const emptyQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      unitsRepository.createQueryBuilder.mockReturnValue(emptyQb);

      const result = await service.getStats(tenantId);

      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
      expect(result.inactive).toBe(0);
      expect(result.byType).toEqual([]);
    });

    it('should count with correct where clauses (tenant + system)', async () => {
      unitsRepository.count.mockResolvedValue(0);
      const emptyQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      unitsRepository.createQueryBuilder.mockReturnValue(emptyQb);

      await service.getStats(tenantId);

      // total: tenant + system
      expect(unitsRepository.count).toHaveBeenNthCalledWith(1, {
        where: [{ tenantId }, { tenantId: IsNull() }],
      });
      // active: tenant + system, isActive true
      expect(unitsRepository.count).toHaveBeenNthCalledWith(2, {
        where: [
          { tenantId, isActive: true },
          { tenantId: IsNull(), isActive: true },
        ],
      });
      // system: solo system
      expect(unitsRepository.count).toHaveBeenNthCalledWith(3, {
        where: { tenantId: IsNull() },
      });
      // custom: solo del tenant
      expect(unitsRepository.count).toHaveBeenNthCalledWith(4, {
        where: { tenantId },
      });
    });
  });
});