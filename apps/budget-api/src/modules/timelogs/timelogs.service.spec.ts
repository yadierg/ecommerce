// apps/budget-api/src/modules/timelogs/timelogs.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { TimeLogsService } from './timelogs.service';
import {
  Project,
  ProjectTask,
  TimeLog,
  TimeLogStatus,
  Worker,
} from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockTimeLogsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockProjectsRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockTasksRepository = {
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockWorkersRepository = {
  findOne: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('TimeLogsService', () => {
  let service: TimeLogsService;
  let timeLogsRepository: typeof mockTimeLogsRepository;
  let projectsRepository: typeof mockProjectsRepository;
  let tasksRepository: typeof mockTasksRepository;
  let workersRepository: typeof mockWorkersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeLogsService,
        {
          provide: getRepositoryToken(TimeLog),
          useValue: mockTimeLogsRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectsRepository,
        },
        {
          provide: getRepositoryToken(ProjectTask),
          useValue: mockTasksRepository,
        },
        {
          provide: getRepositoryToken(Worker),
          useValue: mockWorkersRepository,
        },
      ],
    }).compile();

    service = module.get<TimeLogsService>(TimeLogsService);
    timeLogsRepository = module.get(getRepositoryToken(TimeLog));
    projectsRepository = module.get(getRepositoryToken(Project));
    tasksRepository = module.get(getRepositoryToken(ProjectTask));
    workersRepository = module.get(getRepositoryToken(Worker));
  });

  afterEach(() => {
    jest.clearAllMocks();

    Object.values(mockTimeLogsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockProjectsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockTasksRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
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
  const mockProject = (overrides: Partial<Project> = {}): Project =>
    ({
      id: 'project-1',
      tenantId: 'tenant-1',
      projectNumber: 'PRJ-202609-00001',
      laborCostActual: 0,
      materialsCostActual: 0,
      additionalCostsActual: 0,
      totalCostActual: 0,
      ...overrides,
    }) as Project;

  const mockWorker = (overrides: Partial<Worker> = {}): Worker =>
    ({
      id: 'worker-1',
      tenantId: 'tenant-1',
      name: 'Carlos',
      hourlyRate: 25,
      ...overrides,
    }) as Worker;

  const mockTask = (overrides: Partial<ProjectTask> = {}): ProjectTask =>
    ({
      id: 'task-1',
      projectId: 'project-1',
      name: 'Instalar paneles',
      status: 'pending',
      ...overrides,
    }) as ProjectTask;

  const mockTimeLog = (overrides: Partial<TimeLog> = {}): TimeLog =>
    ({
      id: 'log-1',
      projectId: 'project-1',
      taskId: null,
      workerId: 'worker-1',
      date: new Date('2026-10-20'),
      hours: 8,
      hourlyRate: 25,
      totalCost: 200,
      description: 'Instalación',
      status: TimeLogStatus.PENDING,
      approvedById: null,
      approvedAt: null,
      rejectionReason: null,
      notes: null,
      ...overrides,
    }) as TimeLog;

  // Helper para mockear updateTaskActualHours (createQueryBuilder)
  const mockUpdateTaskHours = (totalHours: string | null = null) => {
    // El createQueryBuilder se usa en updateTaskActualHours Y en getStats Y en recalculate
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(
        totalHours === null ? null : { total: totalHours, totalHours, totalCost: '0' },
      ),
      getRawMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    timeLogsRepository.createQueryBuilder.mockReturnValue(qb);
    return qb;
  };

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto = {
      workerId: 'worker-1',
      date: '2026-10-20',
      hours: 8,
      description: 'Instalación de paneles',
    };

    const setupCreateSuccess = (withTask = false) => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      workersRepository.findOne.mockResolvedValue(mockWorker());
      if (withTask) {
        tasksRepository.findOne.mockResolvedValue(mockTask());
      }
      timeLogsRepository.create.mockImplementation((data) => data);
      timeLogsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'log-1' }),
      );

      // updateTaskActualHours si withTask
      if (withTask) {
        mockUpdateTaskHours('8');
        tasksRepository.update.mockResolvedValue({ affected: 1 });
      }

      // findOne final
      timeLogsRepository.findOne.mockResolvedValue(mockTimeLog());
    };

    it('should create timeLog with calculated totalCost', async () => {
      setupCreateSuccess();

      const result = await service.create('project-1', validDto, 'tenant-1');

      expect(timeLogsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          workerId: 'worker-1',
          hours: 8,
          hourlyRate: 25,
          totalCost: 200, // 8 * 25
          status: TimeLogStatus.PENDING,
        }),
      );
      expect(result.id).toBe('log-1');
    });

    it('should set status to PENDING', async () => {
      setupCreateSuccess();

      await service.create('project-1', validDto, 'tenant-1');

      expect(timeLogsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: TimeLogStatus.PENDING }),
      );
    });

    it('should use worker.hourlyRate for snapshot', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      workersRepository.findOne.mockResolvedValue(
        mockWorker({ hourlyRate: 30 }),
      );
      timeLogsRepository.create.mockImplementation((data) => data);
      timeLogsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'log-1' }),
      );
      timeLogsRepository.findOne.mockResolvedValue(mockTimeLog());

      await service.create('project-1', validDto, 'tenant-1');

      expect(timeLogsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hourlyRate: 30,
          totalCost: 240, // 8 * 30
        }),
      );
    });

    it('should throw NotFoundException if project not found', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('project-1', validDto, 'tenant-1'),
      ).rejects.toThrow('Proyecto project-1 no encontrado');
    });

    it('should throw BadRequestException if worker not found', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      workersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('project-1', validDto, 'tenant-1'),
      ).rejects.toThrow('Worker no encontrado');
    });

    it('should validate task if taskId provided', async () => {
      setupCreateSuccess(true);

      await service.create(
        'project-1',
        { ...validDto, taskId: 'task-1' },
        'tenant-1',
      );

      expect(tasksRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-1', projectId: 'project-1' },
      });
    });

    it('should throw BadRequestException if task not found', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      workersRepository.findOne.mockResolvedValue(mockWorker());
      tasksRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          'project-1',
          { ...validDto, taskId: 'task-1' },
          'tenant-1',
        ),
      ).rejects.toThrow('Tarea no encontrada en este proyecto');
    });

    it('should update task actualHours when taskId provided', async () => {
      setupCreateSuccess(true);

      await service.create(
        'project-1',
        { ...validDto, taskId: 'task-1' },
        'tenant-1',
      );

      expect(tasksRepository.update).toHaveBeenCalledWith('task-1', {
        actualHours: 8,
      });
    });

    it('should NOT update task if no taskId', async () => {
      setupCreateSuccess();

      await service.create('project-1', validDto, 'tenant-1');

      expect(tasksRepository.update).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    const setupFindAll = () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());

      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockTimeLog()], 1]),
        getRawOne: jest
          .fn()
          .mockResolvedValue({ totalHours: '8', totalCost: '200' }),
      };
      timeLogsRepository.createQueryBuilder.mockReturnValue(qb);
      return qb;
    };

    it('should filter by projectId', async () => {
      const qb = setupFindAll();

      await service.findAll('project-1', {}, 'tenant-1');

      expect(qb.where).toHaveBeenCalledWith('log.projectId = :projectId', {
        projectId: 'project-1',
      });
    });

    it('should apply pagination', async () => {
      const qb = setupFindAll();

      await service.findAll('project-1', { page: 3, limit: 5 }, 'tenant-1');

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should filter by workerId, taskId, status', async () => {
      const qb = setupFindAll();

      await service.findAll(
        'project-1',
        {
          workerId: 'worker-1',
          taskId: 'task-1',
          status: TimeLogStatus.APPROVED,
        },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith('log.workerId = :workerId', {
        workerId: 'worker-1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('log.taskId = :taskId', {
        taskId: 'task-1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('log.status = :status', {
        status: TimeLogStatus.APPROVED,
      });
    });

    it('should apply date range', async () => {
      const qb = setupFindAll();

      await service.findAll(
        'project-1',
        { from: '2026-10-01', to: '2026-10-31' },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'log.date BETWEEN :from AND :to',
        { from: '2026-10-01', to: '2026-10-31' },
      );
    });

    it('should include totals in meta', async () => {
      setupFindAll();

      const result = await service.findAll('project-1', {}, 'tenant-1');

      expect(result.meta.totalHours).toBe(8);
      expect(result.meta.totalCost).toBe(200);
    });

    it('should throw NotFoundException if project not found', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findAll('project-1', {}, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return log with relations', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const log = mockTimeLog();
      timeLogsRepository.findOne.mockResolvedValue(log);

      const result = await service.findOne('log-1', 'project-1', 'tenant-1');

      expect(result).toEqual(log);
      expect(timeLogsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'log-1', projectId: 'project-1' },
        relations: ['worker', 'task', 'approvedBy'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      timeLogsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('log-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow('TimeLog log-1 no encontrado');
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    const setupUpdateSuccess = (overrides = {}) => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const log = mockTimeLog({ status: TimeLogStatus.PENDING, ...overrides });
      timeLogsRepository.findOne.mockResolvedValue(log);
      timeLogsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      return log;
    };

    it('should update hours and recalculate totalCost', async () => {
      const log = setupUpdateSuccess();

      await service.update(
        'log-1',
        { hours: 10 },
        'project-1',
        'tenant-1',
      );

      expect(log.hours).toBe(10);
      expect(log.totalCost).toBe(250); // 10 * 25
    });

    it('should convert date string to Date', async () => {
      const log = setupUpdateSuccess();

      await service.update(
        'log-1',
        { date: '2026-11-01' },
        'project-1',
        'tenant-1',
      );

      expect(log.date).toBeInstanceOf(Date);
    });

    it('should NOT recalculate totalCost if hours not provided', async () => {
      const log = setupUpdateSuccess();

      await service.update(
        'log-1',
        { description: 'Nueva' },
        'project-1',
        'tenant-1',
      );

      expect(log.totalCost).toBe(200); // sin cambios
    });

    it('should update task actualHours if log has taskId', async () => {
      setupUpdateSuccess({ taskId: 'task-1' });
      mockUpdateTaskHours('10');
      tasksRepository.update.mockResolvedValue({ affected: 1 });

      await service.update('log-1', { hours: 10 }, 'project-1', 'tenant-1');

      expect(tasksRepository.update).toHaveBeenCalledWith('task-1', {
        actualHours: 10,
      });
    });

    it('should throw BadRequestException if not PENDING', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      timeLogsRepository.findOne.mockResolvedValue(
        mockTimeLog({ status: TimeLogStatus.APPROVED }),
      );

      await expect(
        service.update('log-1', { hours: 10 }, 'project-1', 'tenant-1'),
      ).rejects.toThrow('Solo se pueden editar registros pendientes');
    });
  });

  // ============================================
  // APPROVE ⭐
  // ============================================
  describe('approve', () => {
    const setupApprove = (overrides = {}) => {
        projectsRepository.findOne.mockResolvedValue(mockProject());
        const log = mockTimeLog({ status: TimeLogStatus.PENDING, ...overrides });
        timeLogsRepository.findOne
            .mockResolvedValueOnce(log) // findOne inicial
            .mockResolvedValueOnce({ ...log, status: TimeLogStatus.APPROVED }); // findOne final
        timeLogsRepository.save.mockImplementation((data) =>
            Promise.resolve(data),
        );

        // ✅ FIX: recalculateProjectLaborCost usa createQueryBuilder + projectsRepository.save
        mockUpdateTaskHours('0');
        projectsRepository.save.mockImplementation((data) =>
            Promise.resolve(data),
        );

        return log;
    };

    it('should approve PENDING log', async () => {
      const log = setupApprove();

      const result = await service.approve(
        'log-1',
        'project-1',
        'tenant-1',
        'user-1',
      );

      expect(log.status).toBe(TimeLogStatus.APPROVED);
      expect(log.approvedById).toBe('user-1');
      expect(log.approvedAt).toBeInstanceOf(Date);
      expect(result.status).toBe(TimeLogStatus.APPROVED);
    });

    it('should recalculate project labor cost after approve', async () => {
      setupApprove();

      // recalculateProjectLaborCost: createQueryBuilder + projectsRepository.findOne + save
      mockUpdateTaskHours('0');
      projectsRepository.findOne
        .mockResolvedValueOnce(mockProject()) // verifyProject
        .mockResolvedValueOnce(
          mockProject({
            materialsCostActual: 1000,
            additionalCostsActual: 500,
          }),
        ); // recalculateProjectLaborCost
      projectsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.approve('log-1', 'project-1', 'tenant-1', 'user-1');

      expect(projectsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          laborCostActual: 0,
          totalCostActual: 1500, // 1000 + 0 + 500
        }),
      );
    });

    it('should throw BadRequestException if not PENDING', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      timeLogsRepository.findOne.mockResolvedValue(
        mockTimeLog({ status: TimeLogStatus.APPROVED }),
      );

      await expect(
        service.approve('log-1', 'project-1', 'tenant-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update task actualHours if log has taskId', async () => {
      setupApprove({ taskId: 'task-1' });
      mockUpdateTaskHours('8');
      tasksRepository.update.mockResolvedValue({ affected: 1 });
      projectsRepository.findOne.mockResolvedValue(mockProject());
      projectsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.approve('log-1', 'project-1', 'tenant-1', 'user-1');

      expect(tasksRepository.update).toHaveBeenCalledWith('task-1', {
        actualHours: 8,
      });
    });
  });

  // ============================================
  // REJECT
  // ============================================
  describe('reject', () => {
    it('should reject PENDING log with reason', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const log = mockTimeLog({ status: TimeLogStatus.PENDING });
      timeLogsRepository.findOne.mockResolvedValue(log);
      timeLogsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.reject(
        'log-1',
        'Horas incorrectas',
        'project-1',
        'tenant-1',
        'user-1',
      );

      expect(log.status).toBe(TimeLogStatus.REJECTED);
      expect(log.rejectionReason).toBe('Horas incorrectas');
      expect(log.approvedById).toBe('user-1');
      expect(log.approvedAt).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException if not PENDING', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      timeLogsRepository.findOne.mockResolvedValue(
        mockTimeLog({ status: TimeLogStatus.REJECTED }),
      );

      await expect(
        service.reject('log-1', 'motivo', 'project-1', 'tenant-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update task if log has taskId', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const log = mockTimeLog({
        status: TimeLogStatus.PENDING,
        taskId: 'task-1',
      });
      timeLogsRepository.findOne.mockResolvedValue(log);
      timeLogsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      mockUpdateTaskHours('0');
      tasksRepository.update.mockResolvedValue({ affected: 1 });

      await service.reject(
        'log-1',
        'motivo',
        'project-1',
        'tenant-1',
        'user-1',
      );

      expect(tasksRepository.update).toHaveBeenCalled();
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove a PENDING log', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const log = mockTimeLog({ status: TimeLogStatus.PENDING });
      timeLogsRepository.findOne.mockResolvedValue(log);
      timeLogsRepository.remove.mockResolvedValue(log);

      const result = await service.remove('log-1', 'project-1', 'tenant-1');

      expect(result).toEqual({ message: 'Registro eliminado' });
      expect(timeLogsRepository.remove).toHaveBeenCalledWith(log);
    });

    it('should remove a REJECTED log', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const log = mockTimeLog({ status: TimeLogStatus.REJECTED });
      timeLogsRepository.findOne.mockResolvedValue(log);
      timeLogsRepository.remove.mockResolvedValue(log);

      const result = await service.remove('log-1', 'project-1', 'tenant-1');

      expect(result).toEqual({ message: 'Registro eliminado' });
    });

    it('should throw BadRequestException if APPROVED', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      timeLogsRepository.findOne.mockResolvedValue(
        mockTimeLog({ status: TimeLogStatus.APPROVED }),
      );

      await expect(
        service.remove('log-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow('No se puede eliminar un registro aprobado');
    });

    it('should update task if log had taskId', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const log = mockTimeLog({
        status: TimeLogStatus.PENDING,
        taskId: 'task-1',
      });
      timeLogsRepository.findOne.mockResolvedValue(log);
      timeLogsRepository.remove.mockResolvedValue(log);
      mockUpdateTaskHours('0');
      tasksRepository.update.mockResolvedValue({ affected: 1 });

      await service.remove('log-1', 'project-1', 'tenant-1');

      expect(tasksRepository.update).toHaveBeenCalled();
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return full statistics', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());

      const totalsQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalHours: '120',
          totalCost: '3000',
          totalLogs: '15',
        }),
      };

      const byStatusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'approved', count: '10', hours: '80', cost: '2000' },
          { status: 'pending', count: '5', hours: '40', cost: '1000' },
        ]),
      };

      const byWorkerQb = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { workerId: 'worker-1', workerName: 'Carlos', hours: '80', cost: '2000' },
        ]),
      };

      timeLogsRepository.createQueryBuilder
        .mockReturnValueOnce(totalsQb)
        .mockReturnValueOnce(byStatusQb)
        .mockReturnValueOnce(byWorkerQb);

      const result = await service.getStats('project-1', 'tenant-1');

      expect(result.totalLogs).toBe(15);
      expect(result.totalHours).toBe(120);
      expect(result.totalCost).toBe(3000);
      expect(result.byStatus).toHaveLength(2);
      expect(result.byWorker).toHaveLength(1);
    });

    it('should return zeros when no data', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());

      const emptyQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      timeLogsRepository.createQueryBuilder.mockReturnValue(emptyQb);

      const result = await service.getStats('project-1', 'tenant-1');

      expect(result.totalLogs).toBe(0);
      expect(result.totalHours).toBe(0);
      expect(result.totalCost).toBe(0);
    });

    it('should filter byWorker by APPROVED status only', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());

      const totalsQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      };
      const byStatusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      const byWorkerQb = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      timeLogsRepository.createQueryBuilder
        .mockReturnValueOnce(totalsQb)
        .mockReturnValueOnce(byStatusQb)
        .mockReturnValueOnce(byWorkerQb);

      await service.getStats('project-1', 'tenant-1');

      expect(byWorkerQb.andWhere).toHaveBeenCalledWith(
        'log.status = :status',
        { status: TimeLogStatus.APPROVED },
      );
    });

    it('should throw NotFoundException if project not found', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getStats('project-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});