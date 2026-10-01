// apps/admin-api/src/modules/roles/roles.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

import { RolesService } from './roles.service';
import { Role, Permission } from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockRolesRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
};

const mockPermissionsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('RolesService', () => {
  let service: RolesService;
  let rolesRepository: typeof mockRolesRepository;
  let permissionsRepository: typeof mockPermissionsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRolesRepository,
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionsRepository,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    rolesRepository = module.get(getRepositoryToken(Role));
    permissionsRepository = module.get(getRepositoryToken(Permission));
  });

  afterEach(() => {
    jest.clearAllMocks();

    Object.values(mockRolesRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockPermissionsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // HELPERS
  // ============================================
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

  const mockRole = (overrides: Partial<Role> = {}): Role =>
    ({
      id: 'role-1',
      name: 'store_manager',
      description: 'Gerente de tienda',
      category: 'custom',
      isActive: true,
      isSystem: false,
      permissions: [],
      users: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Role;

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto = {
      name: 'store_manager',
      description: 'Gerente de tienda',
    };

    it('should create role without permissions', async () => {
      rolesRepository.findOne.mockResolvedValue(null);
      rolesRepository.create.mockImplementation((data) => data);
      rolesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'role-1' }),
      );

      const result = await service.create(validDto);

      expect(rolesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'store_manager',
          description: 'Gerente de tienda',
          category: 'custom',
          isActive: true,
          permissions: [],
        }),
      );
      expect(result.id).toBe('role-1');
    });

    it('should check name uniqueness', async () => {
      rolesRepository.findOne.mockResolvedValue(null);
      rolesRepository.create.mockImplementation((data) => data);
      rolesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'role-1' }),
      );

      await service.create(validDto);

      expect(rolesRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'store_manager' },
      });
    });

    it('should throw ConflictException if name already exists', async () => {
      rolesRepository.findOne.mockResolvedValue(mockRole());

      await expect(service.create(validDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(validDto)).rejects.toThrow(
        'El rol "store_manager" ya existe',
      );
    });

    it('should load permissions when permissionIds provided', async () => {
      rolesRepository.findOne.mockResolvedValue(null);
      const permissions = [mockPermission(), mockPermission({ id: 'perm-2' })];
      permissionsRepository.find.mockResolvedValue(permissions);
      rolesRepository.create.mockImplementation((data) => data);
      rolesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'role-1' }),
      );

      await service.create({
        ...validDto,
        permissionIds: ['perm-1', 'perm-2'],
      });

      expect(permissionsRepository.find).toHaveBeenCalled();
      expect(rolesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: permissions,
        }),
      );
    });

    it('should throw BadRequestException if some permissions do not exist', async () => {
      rolesRepository.findOne.mockResolvedValue(null);
      permissionsRepository.find.mockResolvedValue([mockPermission()]); // solo 1 de 2

      await expect(
        service.create({
          ...validDto,
          permissionIds: ['perm-1', 'perm-nonexistent'],
        }),
      ).rejects.toThrow('Algunos permisos no existen');
    });

    it('should use custom category if provided', async () => {
      rolesRepository.findOne.mockResolvedValue(null);
      rolesRepository.create.mockImplementation((data) => data);
      rolesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'role-1' }),
      );

      await service.create({ ...validDto, category: 'custom' });

      expect(rolesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'custom' }),
      );
    });

    it('should default isActive to true', async () => {
      rolesRepository.findOne.mockResolvedValue(null);
      rolesRepository.create.mockImplementation((data) => data);
      rolesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'role-1' }),
      );

      await service.create(validDto);

      expect(rolesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should return roles ordered by name ASC', async () => {
      const roles = [mockRole(), mockRole({ id: 'role-2' })];
      rolesRepository.find.mockResolvedValue(roles);

      const result = await service.findAll();

      expect(result).toEqual(roles);
      expect(rolesRepository.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
    });

    it('should return empty array when no roles', async () => {
      rolesRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return role with permissions and users relations', async () => {
      const role = mockRole();
      rolesRepository.findOne.mockResolvedValue(role);

      const result = await service.findOne('role-1');

      expect(result).toEqual(role);
      expect(rolesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'role-1' },
        relations: ['permissions', 'users'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      rolesRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('role-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('role-1')).rejects.toThrow(
        'Rol role-1 no encontrado',
      );
    });
  });

  // ============================================
  // FIND BY NAME
  // ============================================
  describe('findByName', () => {
    it('should return role by name with permissions', async () => {
      const role = mockRole();
      rolesRepository.findOne.mockResolvedValue(role);

      const result = await service.findByName('store_manager');

      expect(result).toEqual(role);
      expect(rolesRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'store_manager' },
        relations: ['permissions'],
      });
    });

    it('should return null if not found (no throw)', async () => {
      rolesRepository.findOne.mockResolvedValue(null);

      const result = await service.findByName('no-existe');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should update name for non-system role', async () => {
      const role = mockRole({ isSystem: false });
      rolesRepository.findOne.mockResolvedValue(role);
      rolesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update('role-1', { name: 'new_name' });

      expect(result.name).toBe('new_name');
    });

    it('should throw BadRequestException if changing name of system role', async () => {
      const role = mockRole({ isSystem: true, name: 'super_admin' });
      rolesRepository.findOne.mockResolvedValue(role);

      await expect(
        service.update('role-1', { name: 'renamed' }),
      ).rejects.toThrow('No se puede cambiar el nombre de un rol del sistema');
    });

    it('should allow updating other fields of system role', async () => {
      const role = mockRole({ isSystem: true, name: 'super_admin' });
      rolesRepository.findOne.mockResolvedValue(role);
      rolesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update('role-1', {
        description: 'Nueva descripción',
      });

      expect(result.description).toBe('Nueva descripción');
    });

    it('should NOT throw if system role name is unchanged', async () => {
      const role = mockRole({ isSystem: true, name: 'super_admin' });
      rolesRepository.findOne.mockResolvedValue(role);
      rolesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update('role-1', { name: 'super_admin' });

      expect(result.name).toBe('super_admin');
    });

    it('should update permissions when permissionIds provided', async () => {
      const role = mockRole();
      rolesRepository.findOne.mockResolvedValue(role);
      const permissions = [mockPermission(), mockPermission({ id: 'perm-2' })];
      permissionsRepository.find.mockResolvedValue(permissions);
      rolesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('role-1', { permissionIds: ['perm-1', 'perm-2'] });

      expect(role.permissions).toEqual(permissions);
    });

    it('should throw BadRequestException if permissions not all exist', async () => {
      const role = mockRole();
      rolesRepository.findOne.mockResolvedValue(role);
      permissionsRepository.find.mockResolvedValue([mockPermission()]);

      await expect(
        service.update('role-1', { permissionIds: ['perm-1', 'perm-x'] }),
      ).rejects.toThrow('Algunos permisos no existen');
    });

    it('should update category and isActive', async () => {
      const role = mockRole();
      rolesRepository.findOne.mockResolvedValue(role);
      rolesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('role-1', {
        category: 'system',
        isActive: false,
      });

      expect(role.category).toBe('system');
      expect(role.isActive).toBe(false);
    });

    it('should throw NotFoundException if role not found', async () => {
      rolesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('role-1', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove custom role', async () => {
      const role = mockRole({ isSystem: false });
      rolesRepository.findOne.mockResolvedValue(role);
      rolesRepository.remove.mockResolvedValue(role);

      const result = await service.remove('role-1');

      expect(result).toEqual({ message: 'Rol eliminado' });
      expect(rolesRepository.remove).toHaveBeenCalledWith(role);
    });

    it('should throw BadRequestException if system role', async () => {
      const role = mockRole({ isSystem: true, name: 'super_admin' });
      rolesRepository.findOne.mockResolvedValue(role);

      await expect(service.remove('role-1')).rejects.toThrow(
        'No se puede eliminar un rol del sistema',
      );
    });

    it('should not call remove if system role', async () => {
      rolesRepository.findOne.mockResolvedValue(
        mockRole({ isSystem: true }),
      );

      await expect(service.remove('role-1')).rejects.toThrow();

      expect(rolesRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if role not found', async () => {
      rolesRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('role-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // ASSIGN PERMISSIONS
  // ============================================
  describe('assignPermissions', () => {
    it('should replace role permissions', async () => {
      const role = mockRole();
      rolesRepository.findOne.mockResolvedValue(role);
      const permissions = [mockPermission(), mockPermission({ id: 'perm-2' })];
      permissionsRepository.find.mockResolvedValue(permissions);
      rolesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.assignPermissions('role-1', [
        'perm-1',
        'perm-2',
      ]);

      expect(result.permissions).toEqual(permissions);
      expect(rolesRepository.save).toHaveBeenCalledWith(role);
    });

    it('should allow empty permissionIds array', async () => {
      const role = mockRole({ permissions: [mockPermission()] });
      rolesRepository.findOne.mockResolvedValue(role);
      permissionsRepository.find.mockResolvedValue([]);
      rolesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.assignPermissions('role-1', []);

      expect(result.permissions).toEqual([]);
    });

    it('should throw BadRequestException if some permissions do not exist', async () => {
      const role = mockRole();
      rolesRepository.findOne.mockResolvedValue(role);
      permissionsRepository.find.mockResolvedValue([mockPermission()]);

      await expect(
        service.assignPermissions('role-1', ['perm-1', 'perm-x']),
      ).rejects.toThrow('Algunos permisos no existen');
    });

    it('should throw NotFoundException if role not found', async () => {
      rolesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignPermissions('role-1', ['perm-1']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return total, active, inactive, system, custom', async () => {
      rolesRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8) // active
        .mockResolvedValueOnce(6); // system

      const result = await service.getStats();

      expect(result).toEqual({
        total: 10,
        active: 8,
        inactive: 2,
        system: 6,
        custom: 4,
      });
    });

    it('should call count with correct where clauses', async () => {
      rolesRepository.count.mockResolvedValue(0);

      await service.getStats();

      expect(rolesRepository.count).toHaveBeenNthCalledWith(1);
      expect(rolesRepository.count).toHaveBeenNthCalledWith(2, {
        where: { isActive: true },
      });
      expect(rolesRepository.count).toHaveBeenNthCalledWith(3, {
        where: { isSystem: true },
      });
    });

    it('should return zeros when no roles', async () => {
      rolesRepository.count.mockResolvedValue(0);

      const result = await service.getStats();

      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        system: 0,
        custom: 0,
      });
    });
  });
});