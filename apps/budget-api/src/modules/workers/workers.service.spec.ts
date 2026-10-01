// apps/budget-api/src/modules/workers/workers.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { WorkersService } from './workers.service';
import { Worker } from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockWorkersRepository = {
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
describe('WorkersService', () => {
  let service: WorkersService;
  let workersRepository: typeof mockWorkersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkersService,
        {
          provide: getRepositoryToken(Worker),
          useValue: mockWorkersRepository,
        },
      ],
    }).compile();

    service = module.get<WorkersService>(WorkersService);
    workersRepository = module.get(getRepositoryToken(Worker));
  });

  afterEach(() => {
    jest.clearAllMocks();

    Object.values(mockWorkersRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // HELPERS
  // ============================================
  const mockWorker = (overrides: Partial<Worker> = {}): Worker =>
    ({
      id: 'worker-1',
      tenantId: 'tenant-1',
      userId: null,
      name: 'Carlos Electricista',
      email: 'carlos@example.com',
      phone: '+34 600 111 111',
      idNumber: '12345678A',
      address: 'Calle Mayor 1',
      emergencyContact: 'María',
      emergencyPhone: '+34 600 222 222',
      role: 'electricista',
      position: 'Electricista Senior',
      specialties: ['solar', 'battery'],
      certifications: ['OSHA-30'],
      yearsExperience: 5,
      skills: ['wiring', 'installation'],
      hourlyRate: 25,
      dailyRate: 200,
      monthlySalary: null,
      currency: 'USD',
      paymentType: 'hourly',
      weeklyHours: 40,
      isAvailable: true,
      isActive: true,
      hireDate: new Date('2021-01-01'),
      currentProjectId: null,
      totalProjects: 0,
      totalHoursLogged: 0,
      rating: 4.5,
      notes: null,
      ...overrides,
    }) as Worker;

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
    getMany: jest.fn().mockResolvedValue(data),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(null),
  });

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto = {
      name: 'Carlos Electricista',
      role: 'electricista',
      email: 'carlos@example.com',
    };

    it('should create worker with tenantId', async () => {
      workersRepository.create.mockImplementation((data) => data);
      workersRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'worker-1' }),
      );

      const result = await service.create(validDto, 'tenant-1');

      expect(workersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validDto,
          tenantId: 'tenant-1',
        }),
      );
      expect(result.id).toBe('worker-1');
    });

    it('should set hireDate from dto if provided', async () => {
      workersRepository.create.mockImplementation((data) => data);
      workersRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'worker-1' }),
      );

      await service.create(
        { ...validDto, hireDate: '2025-06-15' },
        'tenant-1',
      );

      const createCall = workersRepository.create.mock.calls[0][0];
      expect(createCall.hireDate).toBeInstanceOf(Date);
      expect(createCall.hireDate.toISOString().slice(0, 10)).toBe('2025-06-15');
    });

    it('should set hireDate to today if not provided', async () => {
      workersRepository.create.mockImplementation((data) => data);
      workersRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'worker-1' }),
      );

      const before = new Date();
      await service.create(validDto, 'tenant-1');
      const after = new Date();

      const createCall = workersRepository.create.mock.calls[0][0];
      expect(createCall.hireDate).toBeInstanceOf(Date);
      expect(createCall.hireDate.getTime()).toBeGreaterThanOrEqual(
        before.getTime() - 1000,
      );
      expect(createCall.hireDate.getTime()).toBeLessThanOrEqual(
        after.getTime() + 1000,
      );
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should filter by tenantId', async () => {
      const qb = buildQueryBuilder([]);
      workersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.where).toHaveBeenCalledWith('worker.tenantId = :tenantId', {
        tenantId: 'tenant-1',
      });
    });

    it('should apply pagination', async () => {
      const qb = buildQueryBuilder([]);
      workersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 3, limit: 5 }, 'tenant-1');

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should apply default pagination', async () => {
      const qb = buildQueryBuilder([]);
      workersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it('should apply search across multiple fields', async () => {
      const qb = buildQueryBuilder([]);
      workersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'Carlos' }, 'tenant-1');

      const searchCall = qb.andWhere.mock.calls.find((call) =>
        call[0].includes('ILIKE'),
      );
      expect(searchCall).toBeDefined();
      expect(searchCall![0]).toContain('worker.name');
      expect(searchCall![0]).toContain('worker.email');
      expect(searchCall![0]).toContain('worker.phone');
      expect(searchCall![0]).toContain('worker.position');
      expect(searchCall![1]).toEqual({ search: '%Carlos%' });
    });

    it('should apply role filter', async () => {
      const qb = buildQueryBuilder([]);
      workersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ role: 'ingeniero' }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith('worker.role = :role', {
        role: 'ingeniero',
      });
    });

    it('should apply isAvailable filter', async () => {
      const qb = buildQueryBuilder([]);
      workersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ isAvailable: true }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        'worker.isAvailable = :isAvailable',
        { isAvailable: true },
      );
    });

    it('should apply isActive filter', async () => {
      const qb = buildQueryBuilder([]);
      workersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ isActive: false }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith('worker.isActive = :isActive', {
        isActive: false,
      });
    });

    it('should apply specialties filter (JSONB ?| operator)', async () => {
      const qb = buildQueryBuilder([]);
      workersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { specialties: ['solar', 'battery'] },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'worker.specialties ?| array[:...specialties]',
        { specialties: ['solar', 'battery'] },
      );
    });

    it('should NOT apply specialties filter when empty array', async () => {
      const qb = buildQueryBuilder([]);
      workersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ specialties: [] }, 'tenant-1');

      const specialtiesCalls = qb.andWhere.mock.calls.filter((call) =>
        call[0].includes('specialties'),
      );
      expect(specialtiesCalls).toHaveLength(0);
    });

    it('should order by isAvailable DESC then name ASC', async () => {
      const qb = buildQueryBuilder([]);
      workersRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.orderBy).toHaveBeenCalledWith('worker.isAvailable', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('worker.name', 'ASC');
    });

    it('should return paginated response with meta', async () => {
      const workers = [mockWorker(), mockWorker({ id: 'worker-2' })];
      const qb = buildQueryBuilder(workers, 45);
      workersRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 2, limit: 20 }, 'tenant-1');

      expect(result.data).toEqual(workers);
      expect(result.meta).toEqual({
        total: 45,
        page: 2,
        limit: 20,
        totalPages: 3,
      });
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return worker by id and tenant', async () => {
      const worker = mockWorker();
      workersRepository.findOne.mockResolvedValue(worker);

      const result = await service.findOne('worker-1', 'tenant-1');

      expect(result).toEqual(worker);
      expect(workersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'worker-1', tenantId: 'tenant-1' },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      workersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('worker-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.findOne('worker-1', 'tenant-1'),
      ).rejects.toThrow('Worker worker-1 no encontrado');
    });
  });

  // ============================================
  // FIND AVAILABLE
  // ============================================
  describe('findAvailable', () => {
    it('should return available and active workers', async () => {
      const workers = [mockWorker()];
      workersRepository.find.mockResolvedValue(workers);

      const result = await service.findAvailable('tenant-1');

      expect(result).toEqual(workers);
      expect(workersRepository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isAvailable: true, isActive: true },
        order: { rating: 'DESC', name: 'ASC' },
      });
    });

    it('should filter by role when provided', async () => {
      workersRepository.find.mockResolvedValue([]);

      await service.findAvailable('tenant-1', 'electricista');

      expect(workersRepository.find).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          isAvailable: true,
          isActive: true,
          role: 'electricista',
        },
        order: { rating: 'DESC', name: 'ASC' },
      });
    });

    it('should NOT include role in where if not provided', async () => {
      workersRepository.find.mockResolvedValue([]);

      await service.findAvailable('tenant-1');

      const findCall = workersRepository.find.mock.calls[0][0];
      expect(findCall.where).not.toHaveProperty('role');
    });
  });

  // ============================================
  // FIND BY SPECIALTY
  // ============================================
  describe('findBySpecialty', () => {
    it('should query active workers with specialty (JSONB ? operator)', async () => {
      const workers = [mockWorker()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(workers),
      };
      workersRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findBySpecialty('tenant-1', 'solar');

      expect(result).toEqual(workers);
      expect(qb.where).toHaveBeenCalledWith('worker.tenantId = :tenantId', {
        tenantId: 'tenant-1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('worker.isActive = true');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'worker.specialties ? :specialty',
        { specialty: 'solar' },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('worker.rating', 'DESC');
    });

    it('should return empty array when no matches', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      workersRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findBySpecialty('tenant-1', 'nuclear');

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should update worker fields', async () => {
      const worker = mockWorker();
      workersRepository.findOne.mockResolvedValue(worker);
      workersRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update(
        'worker-1',
        { position: 'Senior Electricista' },
        'tenant-1',
      );

      expect(result.position).toBe('Senior Electricista');
    });

    it('should convert hireDate string to Date', async () => {
      const worker = mockWorker();
      workersRepository.findOne.mockResolvedValue(worker);
      workersRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update(
        'worker-1',
        { hireDate: '2023-03-01' },
        'tenant-1',
      );

      expect(worker.hireDate).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if worker not found', async () => {
      workersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('worker-1', { name: 'X' }, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // SET AVAILABILITY
  // ============================================
  describe('setAvailability', () => {
    it('should set isAvailable to true', async () => {
      const worker = mockWorker({ isAvailable: false });
      workersRepository.findOne.mockResolvedValue(worker);
      workersRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.setAvailability(
        'worker-1',
        true,
        'tenant-1',
      );

      expect(result.isAvailable).toBe(true);
    });

    it('should set isAvailable to false', async () => {
      const worker = mockWorker({ isAvailable: true });
      workersRepository.findOne.mockResolvedValue(worker);
      workersRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.setAvailability(
        'worker-1',
        false,
        'tenant-1',
      );

      expect(result.isAvailable).toBe(false);
    });

    it('should throw NotFoundException if worker not found', async () => {
      workersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.setAvailability('worker-1', true, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // UPDATE STATS
  // ============================================
  describe('updateStats', () => {
    it('should update stats fields', async () => {
      const worker = mockWorker();
      workersRepository.findOne.mockResolvedValue(worker);
      workersRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.updateStats('worker-1', 'tenant-1', {
        totalProjects: 10,
        totalHoursLogged: 250,
        rating: 4.8,
      });

      expect(worker.totalProjects).toBe(10);
      expect(worker.totalHoursLogged).toBe(250);
      expect(worker.rating).toBe(4.8);
    });

    it('should update only provided fields', async () => {
      const worker = mockWorker({
        totalProjects: 5,
        totalHoursLogged: 100,
        rating: 4.0,
      });
      workersRepository.findOne.mockResolvedValue(worker);
      workersRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.updateStats('worker-1', 'tenant-1', { rating: 4.9 });

      expect(worker.totalProjects).toBe(5);
      expect(worker.totalHoursLogged).toBe(100);
      expect(worker.rating).toBe(4.9);
    });

    it('should throw NotFoundException if worker not found', async () => {
      workersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStats('worker-1', 'tenant-1', { rating: 5 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove worker without current project', async () => {
      const worker = mockWorker({ currentProjectId: null });
      workersRepository.findOne.mockResolvedValue(worker);
      workersRepository.remove.mockResolvedValue(worker);

      const result = await service.remove('worker-1', 'tenant-1');

      expect(result).toEqual({ message: 'Worker eliminado' });
      expect(workersRepository.remove).toHaveBeenCalledWith(worker);
    });

    it('should throw NotFoundException if worker assigned to project', async () => {
      workersRepository.findOne.mockResolvedValue(
        mockWorker({ currentProjectId: 'project-1' }),
      );

      await expect(
        service.remove('worker-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.remove('worker-1', 'tenant-1'),
      ).rejects.toThrow('No se puede eliminar un worker asignado a un proyecto');
    });

    it('should not call remove if assigned to project', async () => {
      workersRepository.findOne.mockResolvedValue(
        mockWorker({ currentProjectId: 'project-1' }),
      );

      await expect(service.remove('worker-1', 'tenant-1')).rejects.toThrow();

      expect(workersRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if worker not found', async () => {
      workersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('worker-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return full statistics', async () => {
      workersRepository.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(18) // active
        .mockResolvedValueOnce(12); // available

      const byRoleQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { role: 'electricista', count: '8' },
          { role: 'ingeniero', count: '5' },
          { role: 'ayudante', count: '7' },
        ]),
      };

      const avgRateQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avgRate: '27.50' }),
      };

      workersRepository.createQueryBuilder
        .mockReturnValueOnce(byRoleQb)
        .mockReturnValueOnce(avgRateQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(20);
      expect(result.active).toBe(18);
      expect(result.inactive).toBe(2);
      expect(result.available).toBe(12);
      expect(result.busy).toBe(6); // 18 - 12
      expect(result.byRole).toHaveLength(3);
      expect(result.avgHourlyRate).toBe(27.5);
    });

    it('should return zeros when no workers', async () => {
      workersRepository.count.mockResolvedValue(0);

      const emptyQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue(null),
      };
      workersRepository.createQueryBuilder.mockReturnValue(emptyQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
      expect(result.available).toBe(0);
      expect(result.busy).toBe(0);
      expect(result.avgHourlyRate).toBe(0);
    });

    it('should call count with correct where clauses', async () => {
      workersRepository.count.mockResolvedValue(0);

      const emptyQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue(null),
      };
      workersRepository.createQueryBuilder.mockReturnValue(emptyQb);

      await service.getStats('tenant-1');

      expect(workersRepository.count).toHaveBeenNthCalledWith(1, {
        where: { tenantId: 'tenant-1' },
      });
      expect(workersRepository.count).toHaveBeenNthCalledWith(2, {
        where: { tenantId: 'tenant-1', isActive: true },
      });
      expect(workersRepository.count).toHaveBeenNthCalledWith(3, {
        where: { tenantId: 'tenant-1', isActive: true, isAvailable: true },
      });
    });

    it('should compute avgHourlyRate from active workers only', async () => {
      workersRepository.count.mockResolvedValue(0);

      const byRoleQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      const avgRateQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avgRate: '30' }),
      };

      workersRepository.createQueryBuilder
        .mockReturnValueOnce(byRoleQb)
        .mockReturnValueOnce(avgRateQb);

      await service.getStats('tenant-1');

      expect(avgRateQb.andWhere).toHaveBeenCalledWith(
        'worker.isActive = true',
      );
    });
  });
});