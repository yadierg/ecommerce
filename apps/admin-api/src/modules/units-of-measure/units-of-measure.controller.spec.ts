// apps/admin-api/src/modules/units-of-measure/units-of-measure.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { UnitsOfMeasureController } from './units-of-measure.controller';
import { UnitsOfMeasureService } from './units-of-measure.service';
import { UnitType } from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockUnitsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findActive: jest.fn(),
  findByType: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  toggleActive: jest.fn(),
  remove: jest.fn(),
  getStats: jest.fn(),
};

describe('UnitsOfMeasureController', () => {
  let controller: UnitsOfMeasureController;
  let service: typeof mockUnitsService;

  const tenantId = 'tenant-1';
  const userId = 'user-1';
  const unitId = 'unit-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnitsOfMeasureController],
      providers: [
        { provide: UnitsOfMeasureService, useValue: mockUnitsService },
      ],
    }).compile();

    controller = module.get<UnitsOfMeasureController>(UnitsOfMeasureController);
    service = module.get(UnitsOfMeasureService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.values(mockUnitsService).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================
  // resolveTenantId (privado, testeado indirectamente)
  // ============================================
  describe('resolveTenantId (via endpoints)', () => {
    it('should prefer userTenantId over header', async () => {
      mockUnitsService.findActive.mockResolvedValue([]);

      await controller.findActive(tenantId, 'header-tenant');

      expect(service.findActive).toHaveBeenCalledWith(tenantId);
    });

    it('should use header when userTenantId is null', async () => {
      mockUnitsService.findActive.mockResolvedValue([]);

      await controller.findActive(null, 'header-tenant');

      expect(service.findActive).toHaveBeenCalledWith('header-tenant');
    });

    it('should throw BadRequestException when no tenantId and no header', async () => {
      await expect(
        (async () => controller.findActive(null, undefined))(),
      ).rejects.toThrow(BadRequestException);
      await expect(
        (async () => controller.findActive(null, undefined))(),
      ).rejects.toThrow(/Tenant no especificado/);
    });
  });

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    it('should call service.create with dto, tenantId, userId', async () => {
      const dto = { name: 'Pulgada', abbreviation: 'in', type: UnitType.LENGTH };
      mockUnitsService.create.mockResolvedValue({ id: unitId, ...dto });

      const result = await controller.create(dto as any, tenantId, userId, undefined);

      expect(service.create).toHaveBeenCalledWith(dto, tenantId, userId);
      expect(result.id).toBe(unitId);
    });

    it('should use header tenant when userTenantId is null', async () => {
      const dto = { name: 'Pulgada', abbreviation: 'in', type: UnitType.LENGTH };
      mockUnitsService.create.mockResolvedValue({ id: unitId });

      await controller.create(dto as any, null, userId, 'header-tenant');

      expect(service.create).toHaveBeenCalledWith(dto, 'header-tenant', userId);
    });

    it('should throw BadRequestException when no tenant available', async () => {
      const dto = { name: 'Pulgada', abbreviation: 'in' };

      await expect(
        (async () => controller.create(dto as any, null, userId, undefined))(),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should delegate to service.findAll', async () => {
      const query = { page: 1, limit: 10 };
      mockUnitsService.findAll.mockResolvedValue({ data: [], meta: {} });

      await controller.findAll(query, tenantId, undefined);

      expect(service.findAll).toHaveBeenCalledWith(query, tenantId);
    });

    it('should throw BadRequestException when no tenant', async () => {
      await expect(
        (async () => controller.findAll({}, null, undefined))(),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // FIND ACTIVE
  // ============================================
  describe('findActive', () => {
    it('should delegate to service.findActive', async () => {
      mockUnitsService.findActive.mockResolvedValue([]);

      await controller.findActive(tenantId, undefined);

      expect(service.findActive).toHaveBeenCalledWith(tenantId);
    });
  });

  // ============================================
  // FIND BY TYPE
  // ============================================
  describe('findByType', () => {
    it('should delegate to service.findByType', async () => {
      mockUnitsService.findByType.mockResolvedValue([]);

      await controller.findByType(UnitType.LENGTH, tenantId, undefined);

      expect(service.findByType).toHaveBeenCalledWith(tenantId, UnitType.LENGTH);
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should delegate to service.findOne', async () => {
      mockUnitsService.findOne.mockResolvedValue({ id: unitId });

      await controller.findOne(unitId, tenantId, undefined);

      expect(service.findOne).toHaveBeenCalledWith(unitId, tenantId);
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should delegate to service.update', async () => {
      const dto = { name: 'Nuevo' };
      mockUnitsService.update.mockResolvedValue({ id: unitId, ...dto });

      await controller.update(unitId, dto as any, tenantId, undefined);

      expect(service.update).toHaveBeenCalledWith(unitId, dto, tenantId);
    });
  });

  // ============================================
  // TOGGLE ACTIVE
  // ============================================
  describe('toggleActive', () => {
    it('should delegate to service.toggleActive', async () => {
      mockUnitsService.toggleActive.mockResolvedValue({ id: unitId, isActive: false });

      await controller.toggleActive(unitId, tenantId, undefined);

      expect(service.toggleActive).toHaveBeenCalledWith(unitId, tenantId);
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should delegate to service.remove', async () => {
      mockUnitsService.remove.mockResolvedValue({ message: 'Unidad eliminada' });

      const result = await controller.remove(unitId, tenantId, undefined);

      expect(service.remove).toHaveBeenCalledWith(unitId, tenantId);
      expect(result).toEqual({ message: 'Unidad eliminada' });
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should delegate to service.getStats', async () => {
      mockUnitsService.getStats.mockResolvedValue({ total: 10 });

      await controller.getStats(tenantId, undefined);

      expect(service.getStats).toHaveBeenCalledWith(tenantId);
    });
  });
});