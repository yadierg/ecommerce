// apps/budget-api/src/modules/tasks/tasks.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { TasksService } from './tasks.service';
import {
  Project,
  ProjectPhase,
  ProjectTask,
  PhaseStatus,
  TaskStatus,
  TaskPriority,
  Worker,
} from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockTasksRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockProjectsRepository = {
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockPhasesRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockWorkersRepository = {
  findOne: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('TasksService', () => {
  let service: TasksService;
  let tasksRepository: typeof mockTasksRepository;
  let projectsRepository: typeof mockProjectsRepository;
  let phasesRepository: typeof mockPhasesRepository;
  let workersRepository: typeof mockWorkersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(ProjectTask),
          useValue: mockTasksRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectsRepository,
        },
        {
          provide: getRepositoryToken(ProjectPhase),
          useValue: mockPhasesRepository,
        },
        {
          provide: getRepositoryToken(Worker),
          useValue: mockWorkersRepository,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    tasksRepository = module.get(getRepositoryToken(ProjectTask));
    projectsRepository = module.get(getRepositoryToken(Project));
    phasesRepository = module.get(getRepositoryToken(ProjectPhase));
    workersRepository = module.get(getRepositoryToken(Worker));
  });

  afterEach(() => {
    jest.clearAllMocks();

    Object.values(mockTasksRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockProjectsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockPhasesRepository).forEach((mock: any) => {
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
      progressPercentage: 0,
      totalTasks: 0,
      completedTasks: 0,
      ...overrides,
    }) as Project;

  const mockPhase = (overrides: Partial<ProjectPhase> = {}): ProjectPhase =>
    ({
      id: 'phase-1',
      projectId: 'project-1',
      name: 'Fase 1',
      order: 1,
      status: PhaseStatus.PENDING,
      progressPercentage: 0,
      totalTasks: 0,
      completedTasks: 0,
      ...overrides,
    }) as ProjectPhase;

  const mockTask = (overrides: Partial<ProjectTask> = {}): ProjectTask =>
    ({
      id: 'task-1',
      projectId: 'project-1',
      phaseId: null,
      workerId: null,
      name: 'Instalar paneles',
      description: null,
      order: 1,
      status: TaskStatus.PENDING,
      priority: TaskPriority.NORMAL,
      estimatedHours: 8,
      actualHours: 0,
      startDate: null,
      dueDate: null,
      completedAt: null,
      notes: null,
      ...overrides,
    }) as ProjectTask;

  const mockWorker = { id: 'worker-1', name: 'Carlos' };

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto = {
      name: 'Instalar paneles',
      estimatedHours: 8,
    };

    const setupCreateSuccess = (phaseId?: string) => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      if (phaseId) {
        phasesRepository.findOne.mockResolvedValue(mockPhase({ id: phaseId }));
      }
      tasksRepository.create.mockImplementation((data) => data);
      tasksRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'task-1' }),
      );
      // recalculateTaskCounts
      tasksRepository.find.mockResolvedValue([]);
      projectsRepository.update.mockResolvedValue({ affected: 1 });
      if (phaseId) {
        phasesRepository.update.mockResolvedValue({ affected: 1 });
      }
    };

    it('should create task with PENDING status', async () => {
      setupCreateSuccess();

      const result = await service.create('project-1', validDto, 'tenant-1');

      expect(tasksRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validDto,
          projectId: 'project-1',
          status: TaskStatus.PENDING,
        }),
      );
      expect(result.id).toBe('task-1');
    });

    it('should convert dueDate string to Date', async () => {
      setupCreateSuccess();

      await service.create(
        'project-1',
        { ...validDto, dueDate: '2026-10-20' },
        'tenant-1',
      );

      const createCall = tasksRepository.create.mock.calls[0][0];
      expect(createCall.dueDate).toBeInstanceOf(Date);
    });

    it('should verify phase exists if phaseId provided', async () => {
      setupCreateSuccess('phase-1');

      await service.create(
        'project-1',
        { ...validDto, phaseId: 'phase-1' },
        'tenant-1',
      );

      expect(phasesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'phase-1', projectId: 'project-1' },
      });
    });

    it('should throw BadRequestException if phase not found', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      phasesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          'project-1',
          { ...validDto, phaseId: 'phase-1' },
          'tenant-1',
        ),
      ).rejects.toThrow('Fase no encontrada en este proyecto');
    });

    it('should verify worker exists if workerId provided', async () => {
      setupCreateSuccess();
      workersRepository.findOne.mockResolvedValue(mockWorker);

      await service.create(
        'project-1',
        { ...validDto, workerId: 'worker-1' },
        'tenant-1',
      );

      expect(workersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'worker-1', tenantId: 'tenant-1' },
      });
    });

    it('should throw BadRequestException if worker not found', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      workersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          'project-1',
          { ...validDto, workerId: 'worker-1' },
          'tenant-1',
        ),
      ).rejects.toThrow('Worker no encontrado');
    });

    it('should recalculate project counts after create', async () => {
      setupCreateSuccess();

      await service.create('project-1', validDto, 'tenant-1');

      expect(projectsRepository.update).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          totalTasks: expect.any(Number),
          completedTasks: expect.any(Number),
          progressPercentage: expect.any(Number),
        }),
      );
    });

    it('should recalculate phase counts if phaseId provided', async () => {
      setupCreateSuccess('phase-1');

      await service.create(
        'project-1',
        { ...validDto, phaseId: 'phase-1' },
        'tenant-1',
      );

      expect(phasesRepository.update).toHaveBeenCalledWith(
        'phase-1',
        expect.objectContaining({
          totalTasks: expect.any(Number),
          completedTasks: expect.any(Number),
          progressPercentage: expect.any(Number),
        }),
      );
    });

    it('should NOT recalculate phase if no phaseId', async () => {
      setupCreateSuccess();

      await service.create('project-1', validDto, 'tenant-1');

      expect(phasesRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if project not found', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('project-1', validDto, 'tenant-1'),
      ).rejects.toThrow('Proyecto project-1 no encontrado');
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should return all tasks of project ordered', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const tasks = [mockTask()];
      tasksRepository.find.mockResolvedValue(tasks);

      const result = await service.findAll('project-1', 'tenant-1');

      expect(result).toEqual(tasks);
      expect(tasksRepository.find).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        relations: ['worker', 'phase'],
        order: { order: 'ASC', createdAt: 'ASC' },
      });
    });

    it('should filter by phaseId when provided', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      tasksRepository.find.mockResolvedValue([]);

      await service.findAll('project-1', 'tenant-1', 'phase-1');

      expect(tasksRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: 'project-1', phaseId: 'phase-1' },
        }),
      );
    });

    it('should throw NotFoundException if project not found', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findAll('project-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return task with relations', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const task = mockTask();
      tasksRepository.findOne.mockResolvedValue(task);

      const result = await service.findOne('task-1', 'project-1', 'tenant-1');

      expect(result).toEqual(task);
      expect(tasksRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-1', projectId: 'project-1' },
        relations: ['worker', 'phase'],
      });
    });

    it('should throw NotFoundException if task not found', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      tasksRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('task-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow('Tarea task-1 no encontrada');
    });

    it('should throw NotFoundException if project not found', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('task-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should update a pending task', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const task = mockTask();
      tasksRepository.findOne.mockResolvedValue(task);
      tasksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update(
        'task-1',
        { name: 'Nuevo nombre' },
        'project-1',
        'tenant-1',
      );

      expect(result.name).toBe('Nuevo nombre');
    });

    it('should convert dueDate to Date', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const task = mockTask();
      tasksRepository.findOne.mockResolvedValue(task);
      tasksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update(
        'task-1',
        { dueDate: '2026-12-31' },
        'project-1',
        'tenant-1',
      );

      expect(task.dueDate).toBeInstanceOf(Date);
    });

    it('should validate worker if workerId provided', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      tasksRepository.findOne.mockResolvedValue(mockTask());
      workersRepository.findOne.mockResolvedValue(mockWorker);
      tasksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update(
        'task-1',
        { workerId: 'worker-1' },
        'project-1',
        'tenant-1',
      );

      expect(workersRepository.findOne).toHaveBeenCalled();
    });

    it('should throw BadRequestException if worker not found', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      tasksRepository.findOne.mockResolvedValue(mockTask());
      workersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(
          'task-1',
          { workerId: 'worker-x' },
          'project-1',
          'tenant-1',
        ),
      ).rejects.toThrow('Worker no encontrado');
    });

    it('should throw BadRequestException if task COMPLETED', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      tasksRepository.findOne.mockResolvedValue(
        mockTask({ status: TaskStatus.COMPLETED }),
      );

      await expect(
        service.update('task-1', { name: 'x' }, 'project-1', 'tenant-1'),
      ).rejects.toThrow('No se puede editar una tarea completada');
    });
  });

  // ============================================
  // ASSIGN
  // ============================================
  describe('assign', () => {
    it('should assign worker to task', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const task = mockTask();
      tasksRepository.findOne.mockResolvedValue(task);
      workersRepository.findOne.mockResolvedValue(mockWorker);
      tasksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.assign(
        'task-1',
        'worker-1',
        'project-1',
        'tenant-1',
      );

      expect(result.workerId).toBe('worker-1');
      expect(workersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'worker-1', tenantId: 'tenant-1' },
      });
    });

    it('should throw BadRequestException if worker not found', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      tasksRepository.findOne.mockResolvedValue(mockTask());
      workersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assign('task-1', 'worker-x', 'project-1', 'tenant-1'),
      ).rejects.toThrow('Worker no encontrado');
    });

    it('should throw NotFoundException if task not found', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      tasksRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assign('task-1', 'worker-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // START ⭐ (con side-effect en fase)
  // ============================================
  describe('start', () => {
    it('should transition PENDING → IN_PROGRESS', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const task = mockTask({
        status: TaskStatus.PENDING,
        workerId: 'worker-1',
      });
      tasksRepository.findOne.mockResolvedValue(task);
      tasksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.start('task-1', 'project-1', 'tenant-1');

      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
      expect(result.startDate).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException if no worker assigned', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      tasksRepository.findOne.mockResolvedValue(
        mockTask({ status: TaskStatus.PENDING, workerId: null }),
      );

      await expect(
        service.start('task-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow('La tarea debe tener un worker asignado');
    });

    it('should throw BadRequestException if not PENDING', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      tasksRepository.findOne.mockResolvedValue(
        mockTask({ status: TaskStatus.IN_PROGRESS, workerId: 'worker-1' }),
      );

      await expect(
        service.start('task-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should start PENDING phase when task starts', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const task = mockTask({
        status: TaskStatus.PENDING,
        workerId: 'worker-1',
        phaseId: 'phase-1',
      });
      tasksRepository.findOne.mockResolvedValue(task);
      tasksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const phase = mockPhase({ status: PhaseStatus.PENDING });
      phasesRepository.findOne.mockResolvedValue(phase);
      phasesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.start('task-1', 'project-1', 'tenant-1');

      expect(phase.status).toBe(PhaseStatus.IN_PROGRESS);
      expect(phase.startDate).toBeInstanceOf(Date);
      expect(phasesRepository.save).toHaveBeenCalledWith(phase);
    });

    it('should NOT modify phase if already IN_PROGRESS', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const task = mockTask({
        status: TaskStatus.PENDING,
        workerId: 'worker-1',
        phaseId: 'phase-1',
      });
      tasksRepository.findOne.mockResolvedValue(task);
      tasksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const phase = mockPhase({ status: PhaseStatus.IN_PROGRESS });
      phasesRepository.findOne.mockResolvedValue(phase);

      await service.start('task-1', 'project-1', 'tenant-1');

      expect(phasesRepository.save).not.toHaveBeenCalled();
    });

    it('should NOT query phase if task has no phaseId', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const task = mockTask({
        status: TaskStatus.PENDING,
        workerId: 'worker-1',
        phaseId: null,
      });
      tasksRepository.findOne.mockResolvedValue(task);
      tasksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.start('task-1', 'project-1', 'tenant-1');

      expect(phasesRepository.findOne).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // COMPLETE
  // ============================================
  describe('complete', () => {
    const setupComplete = (overrides = {}) => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const task = mockTask({
        status: TaskStatus.IN_PROGRESS,
        workerId: 'worker-1',
        ...overrides,
      });
      tasksRepository.findOne.mockResolvedValue(task);
      tasksRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      // recalculateTaskCounts
      tasksRepository.find.mockResolvedValue([]);
      projectsRepository.update.mockResolvedValue({ affected: 1 });
      return task;
    };

    it('should transition IN_PROGRESS → COMPLETED', async () => {
      setupComplete();

      const result = await service.complete(
        'task-1',
        {},
        'project-1',
        'tenant-1',
      );

      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should set actualHours from dto', async () => {
      setupComplete();

      const result = await service.complete(
        'task-1',
        { actualHours: 6 },
        'project-1',
        'tenant-1',
      );

      expect(result.actualHours).toBe(6);
    });

    it('should append notes when provided', async () => {
      setupComplete();

      const result = await service.complete(
        'task-1',
        { notes: 'Terminado' },
        'project-1',
        'tenant-1',
      );

      expect(result.notes).toContain('[Completado]: Terminado');
    });

    it('should throw BadRequestException if not IN_PROGRESS', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      tasksRepository.findOne.mockResolvedValue(
        mockTask({ status: TaskStatus.PENDING }),
      );

      await expect(
        service.complete('task-1', {}, 'project-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should recalculate project counts after complete', async () => {
      setupComplete();

      await service.complete('task-1', {}, 'project-1', 'tenant-1');

      expect(projectsRepository.update).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          totalTasks: expect.any(Number),
          completedTasks: expect.any(Number),
          progressPercentage: expect.any(Number),
        }),
      );
    });

    it('should recalculate phase counts if task has phaseId', async () => {
      setupComplete({ phaseId: 'phase-1' });
      phasesRepository.update.mockResolvedValue({ affected: 1 });

      await service.complete('task-1', {}, 'project-1', 'tenant-1');

      expect(phasesRepository.update).toHaveBeenCalledWith(
        'phase-1',
        expect.objectContaining({
          totalTasks: expect.any(Number),
          completedTasks: expect.any(Number),
          progressPercentage: expect.any(Number),
        }),
      );
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    const setupRemove = (status = TaskStatus.PENDING, overrides = {}) => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const task = mockTask({ status, ...overrides });
      tasksRepository.findOne.mockResolvedValue(task);
      tasksRepository.remove.mockResolvedValue(task);
      // recalculateTaskCounts
      tasksRepository.find.mockResolvedValue([]);
      projectsRepository.update.mockResolvedValue({ affected: 1 });
      return task;
    };

    it('should remove a PENDING task', async () => {
      const task = setupRemove(TaskStatus.PENDING);

      const result = await service.remove('task-1', 'project-1', 'tenant-1');

      expect(result).toEqual({ message: 'Tarea eliminada' });
      expect(tasksRepository.remove).toHaveBeenCalledWith(task);
    });

    it('should remove a COMPLETED task', async () => {
      setupRemove(TaskStatus.COMPLETED);

      const result = await service.remove('task-1', 'project-1', 'tenant-1');

      expect(result).toEqual({ message: 'Tarea eliminada' });
    });

    it('should throw BadRequestException if IN_PROGRESS', async () => {
      setupRemove(TaskStatus.IN_PROGRESS);

      await expect(
        service.remove('task-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow('No se puede eliminar una tarea en progreso');
    });

    it('should recalculate project counts after remove', async () => {
      setupRemove();

      await service.remove('task-1', 'project-1', 'tenant-1');

      expect(projectsRepository.update).toHaveBeenCalled();
    });

    it('should recalculate phase if task had phaseId', async () => {
      setupRemove(TaskStatus.PENDING, { phaseId: 'phase-1' });
      phasesRepository.update.mockResolvedValue({ affected: 1 });

      await service.remove('task-1', 'project-1', 'tenant-1');

      expect(phasesRepository.update).toHaveBeenCalledWith(
        'phase-1',
        expect.any(Object),
      );
    });
  });
});