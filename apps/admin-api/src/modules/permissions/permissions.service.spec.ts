// apps/admin-api/src/modules/permissions/permissions.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { PermissionsService } from './permissions.service';
import { Permission } from '@ecommerce/core';

const mockPermissionsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('PermissionsService', () => {
  let service: PermissionsService;
  let permissionsRepository: typeof mockPermissionsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionsRepository,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    permissionsRepository = module.get(getRepositoryToken(Permission));
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.values(mockPermissionsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const mockPermission = (overrides: Partial<Permission> = {}): Permission =>
    ({
      id: 'perm-1',
      name: 'users.create',
      resource: 'users',
      action: 'create',
      description: 'Crear usuarios',
      category: 'system',
      createdAt: new Date(),
      ...overrides,
    }) as Permission;

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto = {
      name: 'products.create',
      resource: 'products',
      action: 'create',
    };

    it('should create permission with unique name', async () => {
      permissionsRepository.findOne.mockResolvedValue(null);
      permissionsRepository.create.mockImplementation((data) => data);
      permissionsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'perm-1' }),
      );

      const result = await service.create(validDto);

      expect(permissionsRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'products.create' },
      });
      expect(result.id).toBe('perm-1');
    });

    it('should throw ConflictException if name exists', async () => {
      permissionsRepository.findOne.mockResolvedValue(mockPermission());

      await expect(service.create(validDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(validDto)).rejects.toThrow(
        'El permiso "products.create" ya existe',
      );
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should return all permissions ordered by resource/action', async () => {
      const perms = [mockPermission()];
      permissionsRepository.find.mockResolvedValue(perms);

      const result = await service.findAll();

      expect(result).toEqual(perms);
      expect(permissionsRepository.find).toHaveBeenCalledWith({
        where: {},
        order: { resource: 'ASC', action: 'ASC' },
      });
    });

    it('should filter by resource when provided', async () => {
      permissionsRepository.find.mockResolvedValue([]);

      await service.findAll('users');

      expect(permissionsRepository.find).toHaveBeenCalledWith({
        where: { resource: 'users' },
        order: { resource: 'ASC', action: 'ASC' },
      });
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return permission by id', async () => {
      const perm = mockPermission();
      permissionsRepository.findOne.mockResolvedValue(perm);

      const result = await service.findOne('perm-1');

      expect(result).toEqual(perm);
    });

    it('should throw NotFoundException if not found', async () => {
      permissionsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('perm-1')).rejects.toThrow(
        'Permiso perm-1 no encontrado',
      );
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove permission', async () => {
      const perm = mockPermission();
      permissionsRepository.findOne.mockResolvedValue(perm);
      permissionsRepository.remove.mockResolvedValue(perm);

      const result = await service.remove('perm-1');

      expect(result).toEqual({ message: 'Permiso eliminado' });
      expect(permissionsRepository.remove).toHaveBeenCalledWith(perm);
    });

    it('should throw NotFoundException if not found', async () => {
      permissionsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('perm-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // GET GROUPED
  // ============================================
  describe('getGrouped', () => {
    it('should group permissions by resource', async () => {
      permissionsRepository.find.mockResolvedValue([
        mockPermission({ id: 'p1', resource: 'users', action: 'create' }),
        mockPermission({ id: 'p2', resource: 'users', action: 'read' }),
        mockPermission({ id: 'p3', resource: 'products', action: 'create' }),
      ]);

      const result = await service.getGrouped();

      expect(Object.keys(result)).toEqual(['users', 'products']);
      expect(result.users).toHaveLength(2);
      expect(result.products).toHaveLength(1);
    });

    it('should return empty object if no permissions', async () => {
      permissionsRepository.find.mockResolvedValue([]);

      const result = await service.getGrouped();

      expect(result).toEqual({});
    });
  });

  // ============================================
  // GET RESOURCES
  // ============================================
  describe('getResources', () => {
    it('should return distinct resources', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { resource: 'budgets' },
          { resource: 'products' },
          { resource: 'users' },
        ]),
      };
      permissionsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getResources();

      expect(result).toEqual(['budgets', 'products', 'users']);
      expect(qb.select).toHaveBeenCalledWith('DISTINCT p.resource', 'resource');
    });

    it('should return empty array when no permissions', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      permissionsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getResources();

      expect(result).toEqual([]);
    });
  });
});