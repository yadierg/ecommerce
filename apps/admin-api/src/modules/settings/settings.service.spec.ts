// apps/admin-api/src/modules/settings/settings.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { SettingsService } from './settings.service';
import { Setting } from '@ecommerce/core';

const mockSettingsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('SettingsService', () => {
  let service: SettingsService;
  let settingsRepository: typeof mockSettingsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(Setting),
          useValue: mockSettingsRepository,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    settingsRepository = module.get(getRepositoryToken(Setting));
    // Limpiar la caché interna entre tests
    (service as any).cache = new Map();
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.values(mockSettingsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const mockSetting = (overrides: Partial<Setting> = {}): Setting =>
    ({
      id: 'setting-1',
      key: 'site_name',
      value: 'Mi Ecommerce',
      group: 'general',
      description: 'Nombre del sitio',
      type: 'string',
      isPublic: true,
      isEditable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Setting;

  // ============================================
  // ON MODULE INIT
  // ============================================
  describe('onModuleInit', () => {
    it('should load all settings into cache', async () => {
      settingsRepository.find.mockResolvedValue([
        mockSetting({ key: 'a', value: 1 }),
        mockSetting({ key: 'b', value: 2 }),
      ]);

      await service.onModuleInit();

      const cache = (service as any).cache as Map<string, any>;
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
    });
  });

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto = {
      key: 'site_name',
      value: 'Mi Ecommerce',
      group: 'general',
    };

    it('should create setting and update cache', async () => {
      settingsRepository.findOne.mockResolvedValue(null);
      settingsRepository.create.mockImplementation((data) => data);
      settingsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'setting-1' }),
      );

      const result = await service.create(validDto);

      expect(result.id).toBe('setting-1');
      const cache = (service as any).cache as Map<string, any>;
      expect(cache.get('site_name')).toBe('Mi Ecommerce');
    });

    it('should throw ConflictException if key exists', async () => {
      settingsRepository.findOne.mockResolvedValue(mockSetting());

      await expect(service.create(validDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(validDto)).rejects.toThrow(
        'El setting "site_name" ya existe',
      );
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should return all settings ordered by group/key', async () => {
      const settings = [mockSetting()];
      settingsRepository.find.mockResolvedValue(settings);

      const result = await service.findAll();

      expect(result).toEqual(settings);
      expect(settingsRepository.find).toHaveBeenCalledWith({
        where: {},
        order: { group: 'ASC', key: 'ASC' },
      });
    });

    it('should filter by group when provided', async () => {
      settingsRepository.find.mockResolvedValue([]);

      await service.findAll('general');

      expect(settingsRepository.find).toHaveBeenCalledWith({
        where: { group: 'general' },
        order: { group: 'ASC', key: 'ASC' },
      });
    });
  });

  // ============================================
  // FIND PUBLIC
  // ============================================
  describe('findPublic', () => {
    it('should return key-value object of public settings', async () => {
      settingsRepository.find.mockResolvedValue([
        mockSetting({ key: 'site_name', value: 'X' }),
        mockSetting({ id: 's2', key: 'currency', value: 'USD' }),
      ]);

      const result = await service.findPublic();

      expect(result).toEqual({ site_name: 'X', currency: 'USD' });
      expect(settingsRepository.find).toHaveBeenCalledWith({
        where: { isPublic: true },
        order: { group: 'ASC', key: 'ASC' },
      });
    });

    it('should return empty object when no public settings', async () => {
      settingsRepository.find.mockResolvedValue([]);

      const result = await service.findPublic();

      expect(result).toEqual({});
    });
  });

  // ============================================
  // FIND BY KEY
  // ============================================
  describe('findByKey', () => {
    it('should return setting by key', async () => {
      const setting = mockSetting();
      settingsRepository.findOne.mockResolvedValue(setting);

      const result = await service.findByKey('site_name');

      expect(result).toEqual(setting);
    });

    it('should throw NotFoundException if not found', async () => {
      settingsRepository.findOne.mockResolvedValue(null);

      await expect(service.findByKey('no-existe')).rejects.toThrow(
        'Setting "no-existe" no encontrado',
      );
    });
  });

  // ============================================
  // GET VALUE
  // ============================================
  describe('getValue', () => {
    it('should return from cache if available', async () => {
      (service as any).cache.set('cached_key', 'cached_value');

      const result = await service.getValue('cached_key');

      expect(result).toBe('cached_value');
      expect(settingsRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from repo and cache if not in cache', async () => {
      settingsRepository.findOne.mockResolvedValue(
        mockSetting({ key: 'new_key', value: 'new_value' }),
      );

      const result = await service.getValue('new_key');

      expect(result).toBe('new_value');
      const cache = (service as any).cache as Map<string, any>;
      expect(cache.get('new_key')).toBe('new_value');
    });

    it('should return defaultValue if not found and default provided', async () => {
      settingsRepository.findOne.mockResolvedValue(null);

      const result = await service.getValue('missing', 'default_value');

      expect(result).toBe('default_value');
    });

    it('should throw NotFoundException if not found and no default', async () => {
      settingsRepository.findOne.mockResolvedValue(null);

      await expect(service.getValue('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // GET VALUES
  // ============================================
  describe('getValues', () => {
    it('should return key-value for multiple keys', async () => {
      settingsRepository.find.mockResolvedValue([
        mockSetting({ key: 'a', value: 1 }),
        mockSetting({ id: 's2', key: 'b', value: 2 }),
      ]);

      const result = await service.getValues(['a', 'b', 'c']);

      expect(result).toEqual({ a: 1, b: 2, c: null });
    });

    it('should return null for missing keys', async () => {
      settingsRepository.find.mockResolvedValue([]);

      const result = await service.getValues(['x', 'y']);

      expect(result).toEqual({ x: null, y: null });
    });
  });

  // ============================================
  // FIND BY GROUP
  // ============================================
  describe('findByGroup', () => {
    it('should return settings of group ordered by key', async () => {
      settingsRepository.find.mockResolvedValue([]);

      await service.findByGroup('general');

      expect(settingsRepository.find).toHaveBeenCalledWith({
        where: { group: 'general' },
        order: { key: 'ASC' },
      });
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should update editable setting and cache', async () => {
      const setting = mockSetting({ isEditable: true });
      settingsRepository.findOne.mockResolvedValue(setting);
      settingsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update('setting-1', { value: 'Nuevo' });

      expect(result.value).toBe('Nuevo');
      const cache = (service as any).cache as Map<string, any>;
      expect(cache.get('site_name')).toBe('Nuevo');
    });

    it('should throw ConflictException if not editable', async () => {
      settingsRepository.findOne.mockResolvedValue(
        mockSetting({ isEditable: false }),
      );

      await expect(
        service.update('setting-1', { value: 'X' }),
      ).rejects.toThrow('El setting "site_name" no es editable');
    });

    it('should throw NotFoundException if not found', async () => {
      settingsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('setting-1', { value: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // BULK UPDATE
  // ============================================
  describe('bulkUpdate', () => {
    it('should update multiple editable settings', async () => {
      settingsRepository.findOne
        .mockResolvedValueOnce(mockSetting({ key: 'a', isEditable: true }))
        .mockResolvedValueOnce(mockSetting({ key: 'b', isEditable: true }));
      settingsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.bulkUpdate({ a: 1, b: 2 });

      expect(result).toHaveLength(2);
    });

    it('should skip non-editable settings', async () => {
      settingsRepository.findOne
        .mockResolvedValueOnce(mockSetting({ key: 'a', isEditable: true }))
        .mockResolvedValueOnce(mockSetting({ key: 'b', isEditable: false }));
      settingsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.bulkUpdate({ a: 1, b: 2 });

      expect(result).toHaveLength(1);
    });

    it('should skip missing settings', async () => {
      settingsRepository.findOne.mockResolvedValue(null);

      const result = await service.bulkUpdate({ a: 1, b: 2 });

      expect(result).toHaveLength(0);
    });

    it('should update cache for successful updates', async () => {
      settingsRepository.findOne.mockResolvedValue(
        mockSetting({ key: 'cached', isEditable: true }),
      );
      settingsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.bulkUpdate({ cached: 'new_value' });

      const cache = (service as any).cache as Map<string, any>;
      expect(cache.get('cached')).toBe('new_value');
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove editable setting and delete from cache', async () => {
      const setting = mockSetting({ isEditable: true, key: 'to_remove' });
      settingsRepository.findOne.mockResolvedValue(setting);
      settingsRepository.remove.mockResolvedValue(setting);
      (service as any).cache.set('to_remove', 'value');

      const result = await service.remove('setting-1');

      expect(result).toEqual({ message: 'Setting eliminado correctamente' });
      const cache = (service as any).cache as Map<string, any>;
      expect(cache.has('to_remove')).toBe(false);
    });

    it('should throw ConflictException if not editable', async () => {
      settingsRepository.findOne.mockResolvedValue(
        mockSetting({ isEditable: false }),
      );

      await expect(service.remove('setting-1')).rejects.toThrow(
        'El setting "site_name" no se puede eliminar',
      );
    });

    it('should throw NotFoundException if not found', async () => {
      settingsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('setting-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return total, byGroup, cacheSize', async () => {
      settingsRepository.count.mockResolvedValue(10);

      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { group: 'general', count: '5' },
          { group: 'email', count: '5' },
        ]),
      };
      settingsRepository.createQueryBuilder.mockReturnValue(qb);

      (service as any).cache.set('a', 1);
      (service as any).cache.set('b', 2);

      const result = await service.getStats();

      expect(result.total).toBe(10);
      expect(result.byGroup).toHaveLength(2);
      expect(result.cacheSize).toBe(2);
    });
  });

  // ============================================
  // REFRESH CACHE
  // ============================================
  describe('refreshCache', () => {
    it('should reload cache from repo', async () => {
      settingsRepository.find.mockResolvedValue([
        mockSetting({ key: 'x', value: 100 }),
      ]);
      (service as any).cache.set('old', 'stale');

      const result = await service.refreshCache();

      const cache = (service as any).cache as Map<string, any>;
      expect(cache.has('old')).toBe(false);
      expect(cache.get('x')).toBe(100);
      expect(result.size).toBe(1);
    });
  });
});