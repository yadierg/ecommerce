// apps/admin-api/src/modules/units-of-measure/units-of-measure.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UnitOfMeasure, UnitType, Product } from '@ecommerce/core';
import { UnitsOfMeasureService } from './units-of-measure.service';

describe('UnitsOfMeasureService', () => {
  let service: UnitsOfMeasureService;
  let unitsRepository: jest.Mocked<Repository<UnitOfMeasure>>;
  let productsRepository: jest.Mocked<Repository<Product>>;

  const tenantId = '8ce8f633-a091-4513-9215-8c222c8b97c3';
  const systemUnitId = '0c73b4e8-2973-4e0f-9d3e-f62eec0bc402';
  const customUnitId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const otherTenantId = '11111111-2222-3333-4444-555555555555';

  const systemUnit: UnitOfMeasure = {
    id: systemUnitId,
    tenantId: null,
    name: 'Unidad',
    abbreviation: 'unit',
    nameEn: 'Unit',
    description: null,
    type: UnitType.UNIT,
    decimalPlaces: 0,
    isActive: true,
    isSystem: true,
    order: 1,
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UnitOfMeasure;

  const customUnit: UnitOfMeasure = {
    id: customUnitId,
    tenantId,
    name: 'Kilo custom',
    abbreviation: 'kc',
    nameEn: 'Custom kilo',
    description: null,
    type: UnitType.WEIGHT,
    decimalPlaces: 2,
    isActive: true,
    isSystem: false,
    order: 100,
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UnitOfMeasure;

  beforeEach(async () => {
    const mockUnitsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockProductsRepository = {
      count: jest.fn(),
    };

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

  afterEach(() => jest.clearAllMocks());

  // ─────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto = {
      name: 'Nueva unidad',
      abbreviation: 'nu',
      type: UnitType.UNIT,
    };

    it('debe crear unidad custom del tenant', async () => {
      unitsRepository.findOne.mockResolvedValue(null);
      unitsRepository.create.mockReturnValue({
        ...dto,
        tenantId,
        createdById: 'user-1',
      } as UnitOfMeasure);
      unitsRepository.save.mockResolvedValue({
        ...dto,
        id: 'new-id',
        tenantId,
      } as UnitOfMeasure);

      const result = await service.create(dto, tenantId, 'user-1');

      expect(unitsRepository.create).toHaveBeenCalledWith({
        ...dto,
        tenantId,
        createdById: 'user-1',
      });
      expect(result.id).toBe('new-id');
    });

    it('debe crear sin userId (undefined)', async () => {
      unitsRepository.findOne.mockResolvedValue(null);
      unitsRepository.create.mockReturnValue({ ...dto, tenantId } as UnitOfMeasure);
      unitsRepository.save.mockResolvedValue({ ...dto, id: 'new-id' } as UnitOfMeasure);

      await service.create(dto, tenantId);

      expect(unitsRepository.create).toHaveBeenCalledWith({
        ...dto,
        tenantId,
        createdById: undefined,
      });
    });

    it('debe lanzar ConflictException si la abreviatura ya existe en el tenant', async () => {
      unitsRepository.findOne.mockResolvedValue(customUnit);

      await expect(service.create(dto, tenantId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('debe lanzar ConflictException si la abreviatura choca con una del sistema', async () => {
      unitsRepository.findOne.mockResolvedValue(systemUnit);

      await expect(service.create(dto, tenantId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('debe buscar colisión en tenant Y en sistema (tenantId NULL)', async () => {
      unitsRepository.findOne.mockResolvedValue(null);
      unitsRepository.create.mockReturnValue(dto as any);
      unitsRepository.save.mockResolvedValue(dto as any);

      await service.create({ ...dto, abbreviation: 'm' }, tenantId);

      expect(unitsRepository.findOne).toHaveBeenCalledWith({
        where: [
          { abbreviation: 'm', tenantId },
          { abbreviation: 'm', tenantId: IsNull() },
        ],
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  describe('findAll', () => {
    const buildQb = (data: UnitOfMeasure[], total: number) => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([data, total]),
    });

    it('debe listar unidades del tenant + del sistema', async () => {
      const qb = buildQb([systemUnit, customUnit], 2);
      unitsRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findAll({}, tenantId);

      expect(qb.where).toHaveBeenCalledWith(
        '(unit.tenantId = :tenantId OR unit.tenantId IS NULL)',
        { tenantId },
      );
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('debe aplicar filtro por type', async () => {
      const qb = buildQb([systemUnit], 1);
      unitsRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAll({ type: UnitType.UNIT }, tenantId);

      expect(qb.andWhere).toHaveBeenCalledWith('unit.type = :type', {
        type: UnitType.UNIT,
      });
    });

    it('debe aplicar filtro por isActive', async () => {
      const qb = buildQb([], 0);
      unitsRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAll({ isActive: false }, tenantId);

      expect(qb.andWhere).toHaveBeenCalledWith('unit.isActive = :isActive', {
        isActive: false,
      });
    });

    it('debe aplicar búsqueda por search (name/abbreviation/nameEn)', async () => {
      const qb = buildQb([systemUnit], 1);
      unitsRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAll({ search: 'metro' }, tenantId);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%metro%' },
      );
    });

    it('debe paginar con page y limit', async () => {
      const qb = buildQb([], 0);
      unitsRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAll({ page: 2, limit: 10 }, tenantId);

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('debe usar defaults page=1 limit=50', async () => {
      const qb = buildQb([], 0);
      unitsRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAll({}, tenantId);

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
    });

    it('debe calcular totalPages correctamente', async () => {
      const qb = buildQb([systemUnit], 23);
      unitsRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findAll({ page: 1, limit: 10 }, tenantId);

      expect(result.meta.totalPages).toBe(3); // ceil(23/10)
    });
  });

  // ─────────────────────────────────────────────────────────────
  describe('findActive', () => {
    it('debe devolver activas del tenant + sistema', async () => {
      unitsRepository.find.mockResolvedValue([systemUnit, customUnit]);

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
  });

  // ─────────────────────────────────────────────────────────────
  describe('findByType', () => {
    it('debe filtrar por tipo (tenant + sistema)', async () => {
      unitsRepository.find.mockResolvedValue([systemUnit]);

      const result = await service.findByType(tenantId, UnitType.UNIT);

      expect(unitsRepository.find).toHaveBeenCalledWith({
        where: [
          { tenantId, type: UnitType.UNIT, isActive: true },
          { tenantId: IsNull(), type: UnitType.UNIT, isActive: true },
        ],
        order: { order: 'ASC', name: 'ASC' },
      });
      expect(result).toEqual([systemUnit]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('debe encontrar unidad del sistema', async () => {
      unitsRepository.findOne.mockResolvedValue(systemUnit);
      const result = await service.findOne(systemUnitId, tenantId);
      expect(result).toEqual(systemUnit);
    });

    it('debe encontrar unidad del tenant', async () => {
      unitsRepository.findOne.mockResolvedValue(customUnit);
      const result = await service.findOne(customUnitId, tenantId);
      expect(result).toEqual(customUnit);
    });

    it('debe buscar en tenant Y en sistema', async () => {
      unitsRepository.findOne.mockResolvedValue(systemUnit);

      await service.findOne(systemUnitId, tenantId);

      expect(unitsRepository.findOne).toHaveBeenCalledWith({
        where: [
          { id: systemUnitId, tenantId },
          { id: systemUnitId, tenantId: IsNull() },
        ],
      });
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      unitsRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('no-existe', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  describe('update', () => {
    it('debe actualizar unidad custom', async () => {
      unitsRepository.findOne.mockResolvedValue({ ...customUnit });
      unitsRepository.save.mockResolvedValue({
        ...customUnit,
        name: 'Actualizada',
      });

      const result = await service.update(customUnitId, { name: 'Actualizada' }, tenantId);

      expect(result.name).toBe('Actualizada');
    });

    it('NO debe permitir modificar unidades del sistema', async () => {
      unitsRepository.findOne.mockResolvedValue(systemUnit);

      await expect(
        service.update(systemUnitId, { name: 'Hackeada' }, tenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('NO debe permitir modificar unidades de otro tenant', async () => {
      unitsRepository.findOne.mockResolvedValue({ ...customUnit, tenantId: otherTenantId });

      await expect(
        service.update(customUnitId, { name: 'X' }, tenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      unitsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('no-existe', { name: 'X' }, tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  describe('toggleActive', () => {
    it('debe desactivar unidad activa', async () => {
      unitsRepository.findOne.mockResolvedValue({ ...customUnit, isActive: true });
      unitsRepository.save.mockImplementation(async (u) => u as UnitOfMeasure);

      const result = await service.toggleActive(customUnitId, tenantId);

      expect(result.isActive).toBe(false);
    });

    it('debe activar unidad inactiva', async () => {
      unitsRepository.findOne.mockResolvedValue({ ...customUnit, isActive: false });
      unitsRepository.save.mockImplementation(async (u) => u as UnitOfMeasure);

      const result = await service.toggleActive(customUnitId, tenantId);

      expect(result.isActive).toBe(true);
    });

    it('NO debe permitir togglear unidades del sistema', async () => {
      unitsRepository.findOne.mockResolvedValue(systemUnit);

      await expect(service.toggleActive(systemUnitId, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('debe eliminar unidad custom sin productos asociados', async () => {
      unitsRepository.findOne.mockResolvedValue({ ...customUnit });
      productsRepository.count.mockResolvedValue(0);
      unitsRepository.remove.mockResolvedValue(customUnit);

      const result = await service.remove(customUnitId, tenantId);

      expect(productsRepository.count).toHaveBeenCalledWith({
        where: { unitOfMeasureId: customUnitId },
      });
      expect(unitsRepository.remove).toHaveBeenCalledWith(customUnit);
      expect(result.message).toBe('Unidad eliminada');
    });

    it('NO debe eliminar unidades del sistema', async () => {
      unitsRepository.findOne.mockResolvedValue(systemUnit);

      await expect(service.remove(systemUnitId, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('NO debe eliminar unidades de otro tenant', async () => {
      unitsRepository.findOne.mockResolvedValue({ ...customUnit, tenantId: otherTenantId });

      await expect(service.remove(customUnitId, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar ConflictException si hay productos usándola', async () => {
      unitsRepository.findOne.mockResolvedValue({ ...customUnit });
      productsRepository.count.mockResolvedValue(3);

      await expect(service.remove(customUnitId, tenantId)).rejects.toThrow(
        ConflictException,
      );

      expect(productsRepository.count).toHaveBeenCalledWith({
        where: { unitOfMeasureId: customUnitId },
      });
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      unitsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('no-existe', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  describe('getStats', () => {
    it('debe devolver conteos y desglose por tipo', async () => {
      unitsRepository.count
        .mockResolvedValueOnce(23) // total
        .mockResolvedValueOnce(20) // active
        .mockResolvedValueOnce(23) // system
        .mockResolvedValueOnce(0); // custom

      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { type: 'unit', count: '7' },
          { type: 'length', count: '5' },
          { type: 'weight', count: '4' },
          { type: 'time', count: '2' },
          { type: 'volume', count: '3' },
          { type: 'area', count: '2' },
        ]),
      };
      unitsRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getStats(tenantId);

      expect(result.total).toBe(23);
      expect(result.active).toBe(20);
      expect(result.inactive).toBe(3);
      expect(result.system).toBe(23);
      expect(result.custom).toBe(0);
      expect(result.byType).toHaveLength(6);
    });
  });
});
