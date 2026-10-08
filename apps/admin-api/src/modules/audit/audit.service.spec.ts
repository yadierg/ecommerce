// apps/admin-api/src/modules/audit/audit.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { AuditService } from './audit.service';
import { AuditLog } from '@ecommerce/core';

const mockAuditRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('AuditService', () => {
  let service: AuditService;
  let auditRepository: typeof mockAuditRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditRepository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditRepository = module.get(getRepositoryToken(AuditLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.values(mockAuditRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const mockAuditLog = (overrides: Partial<AuditLog> = {}): AuditLog =>
    ({
      id: 'log-1',
      userId: 'user-1',
      action: 'create',
      entity: 'user',
      entityId: 'user-1',
      changes: { name: 'old' },
      ipAddress: '127.0.0.1',
      userAgent: 'Jest',
      description: 'Creó usuario',
      statusCode: 201,
      durationMs: 42,
      createdAt: new Date(),
      ...overrides,
    }) as AuditLog;

  // ============================================
  // LOG
  // ============================================
  describe('log', () => {
    it('should create and save audit log', async () => {
      const dto = { action: 'create', entity: 'user' };
      auditRepository.create.mockImplementation((data) => data);
      auditRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'log-1' }),
      );

      const result = await service.log(dto);

      expect(auditRepository.create).toHaveBeenCalledWith(dto);
      expect(result?.id).toBe('log-1');
    });

    it('should return null on error (no throw)', async () => {
      auditRepository.create.mockImplementation(() => {
        throw new Error('DB error');
      });

      const result = await service.log({ action: 'x', entity: 'y' });

      expect(result).toBeNull();
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should return paginated logs', async () => {
      const logs = [mockAuditLog()];
      auditRepository.findAndCount.mockResolvedValue([logs, 1]);

      const result = await service.findAll({});

      expect(result.data).toEqual(logs);
      expect(result.meta.total).toBe(1);
    });

    it('should apply pagination', async () => {
      auditRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 3, limit: 5 });

      expect(auditRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('should filter by userId, action, entity, entityId', async () => {
      auditRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        userId: 'user-1',
        action: 'create',
        entity: 'user',
        entityId: 'user-1',
      });

      const findCall = auditRepository.findAndCount.mock.calls[0][0];
      expect(findCall.where.userId).toBe('user-1');
      expect(findCall.where.action).toBe('create');
      expect(findCall.where.entity).toBe('user');
      expect(findCall.where.entityId).toBe('user-1');
    });

    it('should apply date range with Between', async () => {
      auditRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ from: '2026-01-01', to: '2026-12-31' });

      const findCall = auditRepository.findAndCount.mock.calls[0][0];
      expect(findCall.where.createdAt).toBeDefined();
    });

    it('should include relations: [user] and order DESC', async () => {
      auditRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({});

      expect(auditRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['user'],
          order: { createdAt: 'DESC' },
        }),
      );
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return log by id with user relation', async () => {
      const log = mockAuditLog();
      auditRepository.findOne.mockResolvedValue(log);

      const result = await service.findOne('log-1');

      expect(result).toEqual(log);
      expect(auditRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        relations: ['user'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      auditRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('log-1')).rejects.toThrow(
        'Audit log log-1 no encontrado',
      );
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return total, byAction, byEntity, last7Days', async () => {
      auditRepository.count.mockResolvedValue(100);

      const byActionQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { action: 'create', count: '50' },
          { action: 'update', count: '50' },
        ]),
      };
      const byEntityQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { entity: 'user', count: '100' },
        ]),
      };
      const last7DaysQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { date: '2026-09-25', count: '10' },
        ]),
      };

      auditRepository.createQueryBuilder
        .mockReturnValueOnce(byActionQb)
        .mockReturnValueOnce(byEntityQb)
        .mockReturnValueOnce(last7DaysQb);

      const result = await service.getStats();

      expect(result.total).toBe(100);
      expect(result.byAction).toHaveLength(2);
      expect(result.byEntity).toHaveLength(1);
      expect(result.last7Days).toHaveLength(1);
    });

    it('should return zeros when no logs', async () => {
      auditRepository.count.mockResolvedValue(0);

      const emptyQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      auditRepository.createQueryBuilder.mockReturnValue(emptyQb);

      const result = await service.getStats();

      expect(result.total).toBe(0);
      expect(result.byAction).toEqual([]);
    });
  });

  // ============================================
  // CLEAN OLD LOGS
  // ============================================
  describe('cleanOldLogs', () => {
    it('should delete logs older than N days', async () => {
      const qb = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 25 }),
      };
      auditRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.cleanOldLogs(30);

      expect(result.deleted).toBe(25);
      expect(qb.where).toHaveBeenCalledWith(
        'created_at < :date',
        expect.objectContaining({ date: expect.any(Date) }),
      );
    });

    it('should default to 90 days', async () => {
      const qb = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      auditRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.cleanOldLogs();

      expect(result.deleted).toBe(0);
    });

    it('should handle null affected', async () => {
      const qb = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };
      auditRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.cleanOldLogs();

      expect(result.deleted).toBe(0);
    });
  });
});