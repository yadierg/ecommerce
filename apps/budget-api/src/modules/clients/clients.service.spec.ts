// apps/budget-api/src/modules/clients/clients.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { ClientsService } from './clients.service';
import { Client } from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockClientsRepository = {
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
describe('ClientsService', () => {
  let service: ClientsService;
  let clientsRepository: typeof mockClientsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: getRepositoryToken(Client),
          useValue: mockClientsRepository,
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    clientsRepository = module.get(getRepositoryToken(Client));
  });

  afterEach(() => {
    jest.clearAllMocks();

    // Limpiar colas de mockResolvedValueOnce
    Object.values(mockClientsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // HELPERS
  // ============================================
  const mockClient = (overrides: Partial<Client> = {}): Client =>
    ({
      id: 'client-1',
      tenantId: 'tenant-1',
      name: 'Juan Pérez',
      company: 'Pérez S.L.',
      email: 'juan@example.com',
      phone: '+34 600 000 000',
      phoneAlt: null,
      taxId: 'B12345678',
      idNumber: '12345678A',
      address: 'Calle Mayor 1',
      city: 'Madrid',
      state: 'Madrid',
      postalCode: '28001',
      country: 'España',
      type: 'individual',
      category: 'residential',
      source: 'referral',
      creditLimit: 0,
      paymentTerms: 30,
      currency: 'USD',
      isActive: true,
      isVip: false,
      totalProjects: 0,
      totalRevenue: 0,
      lastProjectAt: null,
      notes: null,
      ...overrides,
    }) as Client;

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
      name: 'Juan Pérez',
      email: 'juan@example.com',
      company: 'Pérez S.L.',
    };

    it('should create client without email conflict', async () => {
      clientsRepository.findOne.mockResolvedValue(null);
      clientsRepository.create.mockImplementation((data) => data);
      clientsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'client-1' }),
      );

      const result = await service.create(validDto, 'tenant-1');

      expect(clientsRepository.create).toHaveBeenCalledWith({
        ...validDto,
        tenantId: 'tenant-1',
      });
      expect(result.id).toBe('client-1');
    });

    it('should check email uniqueness when email provided', async () => {
      clientsRepository.findOne.mockResolvedValue(null);
      clientsRepository.create.mockImplementation((data) => data);
      clientsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'client-1' }),
      );

      await service.create(validDto, 'tenant-1');

      expect(clientsRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'juan@example.com', tenantId: 'tenant-1' },
      });
    });

    it('should skip email check when email not provided', async () => {
      clientsRepository.create.mockImplementation((data) => data);
      clientsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'client-1' }),
      );

      await service.create({ name: 'Sin Email' }, 'tenant-1');

      expect(clientsRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      clientsRepository.findOne.mockResolvedValue(mockClient());

      await expect(
        service.create(validDto, 'tenant-1'),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.create(validDto, 'tenant-1'),
      ).rejects.toThrow('Ya existe un cliente con el email "juan@example.com"');
    });

    it('should include tenantId in created client', async () => {
      clientsRepository.findOne.mockResolvedValue(null);
      clientsRepository.create.mockImplementation((data) => data);
      clientsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'client-1' }),
      );

      await service.create(validDto, 'tenant-1');

      expect(clientsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-1' }),
      );
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should filter by tenantId', async () => {
      const qb = buildQueryBuilder([]);
      clientsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.where).toHaveBeenCalledWith('client.tenantId = :tenantId', {
        tenantId: 'tenant-1',
      });
    });

    it('should apply pagination', async () => {
      const qb = buildQueryBuilder([]);
      clientsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 3, limit: 5 }, 'tenant-1');

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should apply default pagination (page 1, limit 20)', async () => {
      const qb = buildQueryBuilder([]);
      clientsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it('should apply search filter across multiple fields', async () => {
      const qb = buildQueryBuilder([]);
      clientsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'Juan' }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%Juan%' },
      );
      // Verifica que busca en múltiples campos
      const searchCall = qb.andWhere.mock.calls.find((call) =>
        call[0].includes('ILIKE'),
      );
      expect(searchCall![0]).toContain('client.name');
      expect(searchCall![0]).toContain('client.company');
      expect(searchCall![0]).toContain('client.email');
      expect(searchCall![0]).toContain('client.phone');
      expect(searchCall![0]).toContain('client.taxId');
    });

    it('should apply type filter', async () => {
      const qb = buildQueryBuilder([]);
      clientsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ type: 'business' }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith('client.type = :type', {
        type: 'business',
      });
    });

    it('should apply category filter', async () => {
      const qb = buildQueryBuilder([]);
      clientsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ category: 'commercial' }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith('client.category = :category', {
        category: 'commercial',
      });
    });

    it('should apply city and country filters', async () => {
      const qb = buildQueryBuilder([]);
      clientsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { city: 'Madrid', country: 'España' },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith('client.city = :city', {
        city: 'Madrid',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('client.country = :country', {
        country: 'España',
      });
    });

    it('should apply isActive filter when false', async () => {
      const qb = buildQueryBuilder([]);
      clientsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ isActive: false }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith('client.isActive = :isActive', {
        isActive: false,
      });
    });

    it('should apply isVip filter when true', async () => {
      const qb = buildQueryBuilder([]);
      clientsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ isVip: true }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith('client.isVip = :isVip', {
        isVip: true,
      });
    });

    it('should not apply isActive filter when undefined', async () => {
      const qb = buildQueryBuilder([]);
      clientsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      const activeCalls = qb.andWhere.mock.calls.filter((call) =>
        call[0].includes('isActive'),
      );
      expect(activeCalls).toHaveLength(0);
    });

    it('should order by isVip DESC then name ASC', async () => {
      const qb = buildQueryBuilder([]);
      clientsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.orderBy).toHaveBeenCalledWith('client.isVip', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('client.name', 'ASC');
    });

    it('should return paginated response with meta', async () => {
      const clients = [mockClient(), mockClient({ id: 'client-2' })];
      const qb = buildQueryBuilder(clients, 42);
      clientsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 2, limit: 20 }, 'tenant-1');

      expect(result.data).toEqual(clients);
      expect(result.meta).toEqual({
        total: 42,
        page: 2,
        limit: 20,
        totalPages: 3, // ceil(42/20)
      });
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return client by id and tenant', async () => {
      const client = mockClient();
      clientsRepository.findOne.mockResolvedValue(client);

      const result = await service.findOne('client-1', 'tenant-1');

      expect(result).toEqual(client);
      expect(clientsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'client-1', tenantId: 'tenant-1' },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      clientsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('client-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.findOne('client-1', 'tenant-1'),
      ).rejects.toThrow('Cliente client-1 no encontrado');
    });
  });

  // ============================================
  // FIND BY EMAIL
  // ============================================
  describe('findByEmail', () => {
    it('should return client when email exists', async () => {
      const client = mockClient();
      clientsRepository.findOne.mockResolvedValue(client);

      const result = await service.findByEmail('juan@example.com', 'tenant-1');

      expect(result).toEqual(client);
      expect(clientsRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'juan@example.com', tenantId: 'tenant-1' },
      });
    });

    it('should return null when email does not exist', async () => {
      clientsRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nope@example.com', 'tenant-1');

      expect(result).toBeNull();
    });

    it('should NOT throw when not found (unlike findOne)', async () => {
      clientsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByEmail('nope@example.com', 'tenant-1'),
      ).resolves.toBeNull();
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should update client fields', async () => {
      const client = mockClient();
      clientsRepository.findOne.mockResolvedValue(client);
      clientsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update(
        'client-1',
        { name: 'Juan Actualizado' },
        'tenant-1',
      );

      expect(result.name).toBe('Juan Actualizado');
    });

    it('should NOT check email if email unchanged', async () => {
      const client = mockClient({ email: 'juan@example.com' });
      clientsRepository.findOne.mockResolvedValue(client);
      clientsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update(
        'client-1',
        { email: 'juan@example.com', name: 'Otro' },
        'tenant-1',
      );

      // Solo se llamó 1 vez a findOne (el de findOne, no el de check email)
      expect(clientsRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should check email uniqueness when email changes', async () => {
      const client = mockClient({ email: 'old@example.com' });
      clientsRepository.findOne
        .mockResolvedValueOnce(client) // findOne inicial
        .mockResolvedValueOnce(null); // check email nuevo

      clientsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update(
        'client-1',
        { email: 'new@example.com' },
        'tenant-1',
      );

      expect(clientsRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'new@example.com', tenantId: 'tenant-1' },
      });
    });

    it('should throw ConflictException if new email already taken', async () => {
      const client = mockClient({ email: 'old@example.com' });
      clientsRepository.findOne
        .mockResolvedValueOnce(client)
        .mockResolvedValueOnce(mockClient({ id: 'other-client' }));

      await expect(
        service.update('client-1', { email: 'taken@example.com' }, 'tenant-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if client not found', async () => {
      clientsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('client-1', { name: 'X' }, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should skip email check when dto has no email', async () => {
      const client = mockClient();
      clientsRepository.findOne.mockResolvedValue(client);
      clientsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('client-1', { name: 'Nuevo' }, 'tenant-1');

      // Solo el findOne inicial, no email check
      expect(clientsRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // UPDATE STATS
  // ============================================
  describe('updateStats', () => {
    it('should update client stats', async () => {
      const client = mockClient();
      clientsRepository.findOne.mockResolvedValue(client);
      clientsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const lastProjectAt = new Date('2026-10-01');
      await service.updateStats('client-1', 'tenant-1', {
        totalProjects: 5,
        totalRevenue: 25000,
        lastProjectAt,
      });

      expect(client.totalProjects).toBe(5);
      expect(client.totalRevenue).toBe(25000);
      expect(client.lastProjectAt).toBe(lastProjectAt);
    });

    it('should update only provided fields', async () => {
      const client = mockClient({ totalProjects: 3, totalRevenue: 1000 });
      clientsRepository.findOne.mockResolvedValue(client);
      clientsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.updateStats('client-1', 'tenant-1', {
        totalRevenue: 5000,
      });

      expect(client.totalProjects).toBe(3); // sin cambios
      expect(client.totalRevenue).toBe(5000);
    });

    it('should throw NotFoundException if client not found', async () => {
      clientsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStats('client-1', 'tenant-1', { totalProjects: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove client with no projects', async () => {
      const client = mockClient({ totalProjects: 0 });
      clientsRepository.findOne.mockResolvedValue(client);
      clientsRepository.remove.mockResolvedValue(client);

      const result = await service.remove('client-1', 'tenant-1');

      expect(result).toEqual({ message: 'Cliente eliminado' });
      expect(clientsRepository.remove).toHaveBeenCalledWith(client);
    });

    it('should throw ConflictException if client has projects', async () => {
      clientsRepository.findOne.mockResolvedValue(
        mockClient({ totalProjects: 3 }),
      );

      await expect(service.remove('client-1', 'tenant-1')).rejects.toThrow(
        ConflictException,
      );

      await expect(service.remove('client-1', 'tenant-1')).rejects.toThrow(
        'No se puede eliminar un cliente con 3 proyectos',
      );
    });

    it('should throw NotFoundException if client not found', async () => {
      clientsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('client-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not call remove if has projects', async () => {
      clientsRepository.findOne.mockResolvedValue(
        mockClient({ totalProjects: 1 }),
      );

      await expect(
        service.remove('client-1', 'tenant-1'),
      ).rejects.toThrow();

      expect(clientsRepository.remove).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return full statistics', async () => {
      clientsRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // active
        .mockResolvedValueOnce(15); // vip

      const byTypeQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { type: 'individual', count: '60' },
          { type: 'business', count: '40' },
        ]),
      };

      const byCategoryQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { category: 'residential', count: '50' },
          { category: 'commercial', count: '50' },
        ]),
      };

      clientsRepository.createQueryBuilder
        .mockReturnValueOnce(byTypeQb)
        .mockReturnValueOnce(byCategoryQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(100);
      expect(result.active).toBe(80);
      expect(result.inactive).toBe(20);
      expect(result.vip).toBe(15);
      expect(result.byType).toHaveLength(2);
      expect(result.byCategory).toHaveLength(2);
    });

    it('should count by tenantId only', async () => {
      clientsRepository.count.mockResolvedValue(0);

      const emptyQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      clientsRepository.createQueryBuilder.mockReturnValue(emptyQb);

      await service.getStats('tenant-1');

      expect(clientsRepository.count).toHaveBeenNthCalledWith(1, {
        where: { tenantId: 'tenant-1' },
      });
      expect(clientsRepository.count).toHaveBeenNthCalledWith(2, {
        where: { tenantId: 'tenant-1', isActive: true },
      });
      expect(clientsRepository.count).toHaveBeenNthCalledWith(3, {
        where: { tenantId: 'tenant-1', isVip: true },
      });
    });

    it('should return zeros when no clients', async () => {
      clientsRepository.count.mockResolvedValue(0);

      const emptyQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      clientsRepository.createQueryBuilder.mockReturnValue(emptyQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
      expect(result.inactive).toBe(0);
      expect(result.vip).toBe(0);
    });

    it('should filter byCategory only where category is not null', async () => {
      clientsRepository.count.mockResolvedValue(0);

      const byTypeQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      const byCategoryQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      clientsRepository.createQueryBuilder
        .mockReturnValueOnce(byTypeQb)
        .mockReturnValueOnce(byCategoryQb);

      await service.getStats('tenant-1');

      expect(byCategoryQb.andWhere).toHaveBeenCalledWith(
        'client.category IS NOT NULL',
      );
    });
  });
});