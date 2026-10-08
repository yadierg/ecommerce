// apps/admin-api/src/modules/tenants/tenants.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { TenantsService } from './tenants.service';
import { Tenant, User } from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockTenantsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
};

const mockUsersRepository = {
  find: jest.fn(),
  count: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('TenantsService', () => {
  let service: TenantsService;
  let tenantsRepository: typeof mockTenantsRepository;
  let usersRepository: typeof mockUsersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    tenantsRepository = module.get(getRepositoryToken(Tenant));
    usersRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();

    Object.values(mockTenantsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockUsersRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // HELPERS
  // ============================================
  const mockTenant = (overrides: Partial<Tenant> = {}): Tenant =>
    ({
      id: 'tenant-1',
      slug: 'instel',
      name: 'Instel S.A.',
      legalName: 'Instel Sociedad Anónima',
      taxId: 'B12345678',
      email: 'contacto@instel.com',
      phone: '+34 600 000 000',
      address: 'Calle Mayor 1',
      logo: null,
      settings: null,
      isActive: true,
      plan: 'basic',
      planExpiresAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    }) as Tenant;

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto = {
      slug: 'instel',
      name: 'Instel S.A.',
      email: 'contacto@instel.com',
    };

    it('should create tenant with unique slug', async () => {
      tenantsRepository.findOne.mockResolvedValue(null);
      tenantsRepository.create.mockImplementation((data) => data);
      tenantsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'tenant-1' }),
      );

      const result = await service.create(validDto);

      expect(tenantsRepository.create).toHaveBeenCalledWith(validDto);
      expect(result.id).toBe('tenant-1');
    });

    it('should check slug uniqueness', async () => {
      tenantsRepository.findOne.mockResolvedValue(null);
      tenantsRepository.create.mockImplementation((data) => data);
      tenantsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'tenant-1' }),
      );

      await service.create(validDto);

      expect(tenantsRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'instel' },
      });
    });

    it('should throw ConflictException if slug already exists', async () => {
      tenantsRepository.findOne.mockResolvedValue(mockTenant());

      await expect(service.create(validDto)).rejects.toThrow(
        ConflictException,
      );

      await expect(service.create(validDto)).rejects.toThrow(
        'El tenant "instel" ya existe',
      );
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should return tenants ordered by name ASC', async () => {
      const tenants = [mockTenant(), mockTenant({ id: 'tenant-2' })];
      tenantsRepository.find.mockResolvedValue(tenants);
      usersRepository.count.mockResolvedValue(5);

      const result = await service.findAll();

      expect(tenantsRepository.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });

    it('should enrich tenants with userCount', async () => {
      tenantsRepository.find.mockResolvedValue([
        mockTenant({ id: 'tenant-1' }),
        mockTenant({ id: 'tenant-2' }),
      ]);
      usersRepository.count
        .mockResolvedValueOnce(3) // tenant-1
        .mockResolvedValueOnce(7); // tenant-2

      const result = await service.findAll();

      expect(result[0].userCount).toBe(3);
      expect(result[1].userCount).toBe(7);
    });

    it('should call usersRepository.count per tenant with tenantId', async () => {
      tenantsRepository.find.mockResolvedValue([
        mockTenant({ id: 'tenant-1' }),
      ]);
      usersRepository.count.mockResolvedValue(0);

      await service.findAll();

      expect(usersRepository.count).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
      });
    });

    it('should return empty array if no tenants', async () => {
      tenantsRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(usersRepository.count).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return tenant by id', async () => {
      const tenant = mockTenant();
      tenantsRepository.findOne.mockResolvedValue(tenant);

      const result = await service.findOne('tenant-1');

      expect(result).toEqual(tenant);
      expect(tenantsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      tenantsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('tenant-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('tenant-1')).rejects.toThrow(
        'Tenant tenant-1 no encontrado',
      );
    });
  });

  // ============================================
  // FIND BY SLUG
  // ============================================
  describe('findBySlug', () => {
    it('should return tenant by slug', async () => {
      const tenant = mockTenant();
      tenantsRepository.findOne.mockResolvedValue(tenant);

      const result = await service.findBySlug('instel');

      expect(result).toEqual(tenant);
      expect(tenantsRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'instel' },
      });
    });

    it('should throw NotFoundException if slug not found', async () => {
      tenantsRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('no-existe')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findBySlug('no-existe')).rejects.toThrow(
        'Tenant "no-existe" no encontrado',
      );
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should update tenant fields', async () => {
      const tenant = mockTenant();
      tenantsRepository.findOne.mockResolvedValue(tenant);
      tenantsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update('tenant-1', { name: 'Nuevo Nombre' });

      expect(result.name).toBe('Nuevo Nombre');
    });

    it('should NOT check slug if slug unchanged', async () => {
      const tenant = mockTenant({ slug: 'instel' });
      tenantsRepository.findOne.mockResolvedValue(tenant);
      tenantsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('tenant-1', {
        slug: 'instel',
        name: 'Nuevo',
      });

      // Solo 1 findOne (el de findOne inicial)
      expect(tenantsRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should check slug uniqueness when slug changes', async () => {
      const tenant = mockTenant({ slug: 'instel' });
      tenantsRepository.findOne
        .mockResolvedValueOnce(tenant) // findOne inicial
        .mockResolvedValueOnce(null); // check slug nuevo

      tenantsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('tenant-1', { slug: 'instel-new' });

      expect(tenantsRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'instel-new' },
      });
    });

    it('should throw ConflictException if new slug taken', async () => {
      const tenant = mockTenant({ slug: 'instel' });
      tenantsRepository.findOne
        .mockResolvedValueOnce(tenant)
        .mockResolvedValueOnce(mockTenant({ id: 'other-tenant', slug: 'taken' }));

      await expect(
        service.update('tenant-1', { slug: 'taken' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should NOT check slug if dto has no slug', async () => {
      const tenant = mockTenant();
      tenantsRepository.findOne.mockResolvedValue(tenant);
      tenantsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('tenant-1', { name: 'Solo nombre' });

      expect(tenantsRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if tenant not found', async () => {
      tenantsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('tenant-1', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove tenant with no users', async () => {
      const tenant = mockTenant();
      tenantsRepository.findOne.mockResolvedValue(tenant);
      usersRepository.count.mockResolvedValue(0);
      tenantsRepository.remove.mockResolvedValue(tenant);

      const result = await service.remove('tenant-1');

      expect(result).toEqual({ message: 'Tenant eliminado' });
      expect(tenantsRepository.remove).toHaveBeenCalledWith(tenant);
    });

    it('should throw ConflictException if tenant has users', async () => {
      tenantsRepository.findOne.mockResolvedValue(mockTenant());
      usersRepository.count.mockResolvedValue(5);

      await expect(service.remove('tenant-1')).rejects.toThrow(
        ConflictException,
      );

      await expect(service.remove('tenant-1')).rejects.toThrow(
        'No se puede eliminar el tenant porque tiene 5 usuario(s) asociado(s)',
      );
    });

    it('should not call remove if tenant has users', async () => {
      tenantsRepository.findOne.mockResolvedValue(mockTenant());
      usersRepository.count.mockResolvedValue(1);

      await expect(service.remove('tenant-1')).rejects.toThrow();

      expect(tenantsRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if tenant not found', async () => {
      tenantsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return total, active, inactive', async () => {
      tenantsRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7); // active

      const result = await service.getStats();

      expect(result).toEqual({
        total: 10,
        active: 7,
        inactive: 3,
      });
    });

    it('should call count with correct where clauses', async () => {
      tenantsRepository.count.mockResolvedValue(0);

      await service.getStats();

      expect(tenantsRepository.count).toHaveBeenNthCalledWith(1);
      expect(tenantsRepository.count).toHaveBeenNthCalledWith(2, {
        where: { isActive: true },
      });
    });

    it('should return zeros when no tenants', async () => {
      tenantsRepository.count.mockResolvedValue(0);

      const result = await service.getStats();

      expect(result).toEqual({ total: 0, active: 0, inactive: 0 });
    });
  });

  // ============================================
  // GET USERS
  // ============================================
  describe('getUsers', () => {
    it('should return users of tenant with roles relation', async () => {
      const users = [
        { id: 'user-1', email: 'a@a.com', name: 'A' },
        { id: 'user-2', email: 'b@b.com', name: 'B' },
      ];
      usersRepository.find.mockResolvedValue(users);

      const result = await service.getUsers('tenant-1');

      expect(result).toEqual(users);
      expect(usersRepository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        relations: ['roles'],
        select: ['id', 'email', 'name', 'role', 'isActive', 'createdAt'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when tenant has no users', async () => {
      usersRepository.find.mockResolvedValue([]);

      const result = await service.getUsers('tenant-1');

      expect(result).toEqual([]);
    });
  });
});