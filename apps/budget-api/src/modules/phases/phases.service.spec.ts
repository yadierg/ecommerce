// apps/budget-api/src/modules/phases/phases.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { PhasesService } from './phases.service';
import {
  Project,
  ProjectPhase,
  ProjectTask,
  PhaseStatus,
} from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockPhasesRepository = {
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

const mockTasksRepository = {
  count: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('PhasesService', () => {
  let service: PhasesService;
  let phasesRepository: typeof mockPhasesRepository;
  let projectsRepository: typeof mockProjectsRepository;
  let tasksRepository: typeof mockTasksRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhasesService,
        {
          provide: getRepositoryToken(ProjectPhase),
          useValue: mockPhasesRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectsRepository,
        },
        {
          provide: getRepositoryToken(ProjectTask),
          useValue: mockTasksRepository,
        },
      ],
    }).compile();

    service = module.get<PhasesService>(PhasesService);
    phasesRepository = module.get(getRepositoryToken(ProjectPhase));
    projectsRepository = module.get(getRepositoryToken(Project));
    tasksRepository = module.get(getRepositoryToken(ProjectTask));
  });

  afterEach(() => {
    jest.clearAllMocks();

    Object.values(mockPhasesRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockProjectsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockTasksRepository).forEach((mock: any) => {
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
      name: 'Montaje de estructura',
      description: 'Fase inicial',
      order: 1,
      status: PhaseStatus.PENDING,
      startDate: null,
      estimatedEndDate: null,
      actualEndDate: null,
      estimatedDays: 3,
      progressPercentage: 0,
      totalTasks: 0,
      completedTasks: 0,
      notes: null,
      tasks: [],
      ...overrides,
    }) as ProjectPhase;

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto = {
      name: 'Montaje de estructura',
      order: 1,
      estimatedDays: 3,
    };

    it('should create phase with projectId and PENDING status', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      phasesRepository.create.mockImplementation((data) => data);
      phasesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'phase-1' }),
      );

      const result = await service.create('project-1', validDto, 'tenant-1');

      expect(phasesRepository.create).toHaveBeenCalledWith({
        ...validDto,
        projectId: 'project-1',
        status: PhaseStatus.PENDING,
      });
      expect(result.id).toBe('phase-1');
    });

    it('should verify project exists first', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      phasesRepository.create.mockImplementation((data) => data);
      phasesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'phase-1' }),
      );

      await service.create('project-1', validDto, 'tenant-1');

      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'project-1', tenantId: 'tenant-1' },
      });
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
    it('should return phases with tasks and order ASC', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const phases = [
        mockPhase({ order: 1 }),
        mockPhase({ id: 'phase-2', order: 2 }),
      ];
      phasesRepository.find.mockResolvedValue(phases);

      const result = await service.findAll('project-1', 'tenant-1');

      expect(result).toEqual(phases);
      expect(phasesRepository.find).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        relations: ['tasks', 'tasks.worker'],
        order: { order: 'ASC' },
      });
    });

    it('should return empty array if no phases', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      phasesRepository.find.mockResolvedValue([]);

      const result = await service.findAll('project-1', 'tenant-1');

      expect(result).toEqual([]);
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
    it('should return phase with relations', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const phase = mockPhase();
      phasesRepository.findOne.mockResolvedValue(phase);

      const result = await service.findOne('phase-1', 'project-1', 'tenant-1');

      expect(result).toEqual(phase);
      expect(phasesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'phase-1', projectId: 'project-1' },
        relations: ['tasks', 'tasks.worker'],
      });
    });

    it('should throw NotFoundException if phase not found', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      phasesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('phase-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow('Fase phase-1 no encontrada');
    });

    it('should throw NotFoundException if project not found', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('phase-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should update a pending phase', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const phase = mockPhase();
      phasesRepository.findOne.mockResolvedValue(phase);
      phasesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update(
        'phase-1',
        { name: 'Nuevo nombre' },
        'project-1',
        'tenant-1',
      );

      expect(result.name).toBe('Nuevo nombre');
    });

    it('should update an in_progress phase', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      phasesRepository.findOne.mockResolvedValue(
        mockPhase({ status: PhaseStatus.IN_PROGRESS }),
      );
      phasesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update(
        'phase-1',
        { notes: 'Actualizado' },
        'project-1',
        'tenant-1',
      );

      expect(result.notes).toBe('Actualizado');
    });

    it('should throw BadRequestException if COMPLETED', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      phasesRepository.findOne.mockResolvedValue(
        mockPhase({ status: PhaseStatus.COMPLETED }),
      );

      await expect(
        service.update('phase-1', { name: 'x' }, 'project-1', 'tenant-1'),
      ).rejects.toThrow('No se puede editar una fase completada');
    });
  });

  // ============================================
  // START
  // ============================================
  describe('start', () => {
    it('should transition PENDING → IN_PROGRESS', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const phase = mockPhase({ status: PhaseStatus.PENDING });
      phasesRepository.findOne.mockResolvedValue(phase);
      phasesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.start('phase-1', 'project-1', 'tenant-1');

      expect(result.status).toBe(PhaseStatus.IN_PROGRESS);
      expect(result.startDate).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException if not PENDING', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      phasesRepository.findOne.mockResolvedValue(
        mockPhase({ status: PhaseStatus.IN_PROGRESS }),
      );

      await expect(
        service.start('phase-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include current status in error message', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      phasesRepository.findOne.mockResolvedValue(
        mockPhase({ status: PhaseStatus.COMPLETED }),
      );

      await expect(
        service.start('phase-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow('Estado actual: completed');
    });
  });

  // ============================================
  // COMPLETE ⭐
  // ============================================
  describe('complete', () => {
    it('should complete an IN_PROGRESS phase with no pending tasks', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const phase = mockPhase({ status: PhaseStatus.IN_PROGRESS });
      phasesRepository.findOne.mockResolvedValue(phase);
      tasksRepository.count.mockResolvedValue(0);
      phasesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      // recalculateProjectProgress
      phasesRepository.find.mockResolvedValue([phase]);
      projectsRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.complete('phase-1', 'project-1', 'tenant-1');

      expect(result.status).toBe(PhaseStatus.COMPLETED);
      expect(result.actualEndDate).toBeInstanceOf(Date);
      expect(result.progressPercentage).toBe(100);
    });

    it('should throw BadRequestException if pending tasks exist', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      phasesRepository.findOne.mockResolvedValue(
        mockPhase({ status: PhaseStatus.IN_PROGRESS }),
      );
      tasksRepository.count.mockResolvedValue(3);

      await expect(
        service.complete('phase-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow('Hay 3 tarea(s) pendiente(s) en esta fase');
    });

    it('should throw BadRequestException if not IN_PROGRESS', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      phasesRepository.findOne.mockResolvedValue(
        mockPhase({ status: PhaseStatus.PENDING }),
      );

      await expect(
        service.complete('phase-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should check pending tasks with correct status', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      phasesRepository.findOne.mockResolvedValue(
        mockPhase({ status: PhaseStatus.IN_PROGRESS }),
      );
      tasksRepository.count.mockResolvedValue(0);
      phasesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      phasesRepository.find.mockResolvedValue([]);
      projectsRepository.update.mockResolvedValue({ affected: 1 });

      await service.complete('phase-1', 'project-1', 'tenant-1');

      expect(tasksRepository.count).toHaveBeenCalledWith({
        where: { phaseId: 'phase-1', status: 'pending' },
      });
    });

    it('should recalculate project progress after complete', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const phase = mockPhase({ status: PhaseStatus.IN_PROGRESS });
      phasesRepository.findOne.mockResolvedValue(phase);
      tasksRepository.count.mockResolvedValue(0);
      phasesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );
      // 2 fases: 1 completada = 50%
      phasesRepository.find.mockResolvedValue([
        { ...phase, status: PhaseStatus.COMPLETED },
        mockPhase({ id: 'phase-2', status: PhaseStatus.PENDING }),
      ]);
      projectsRepository.update.mockResolvedValue({ affected: 1 });

      await service.complete('phase-1', 'project-1', 'tenant-1');

      expect(projectsRepository.update).toHaveBeenCalledWith('project-1', {
        progressPercentage: 50,
        totalTasks: 2,
        completedTasks: 1,
      });
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove a phase with no tasks', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      const phase = mockPhase();
      phasesRepository.findOne.mockResolvedValue(phase);
      tasksRepository.count.mockResolvedValue(0);
      phasesRepository.remove.mockResolvedValue(phase);

      const result = await service.remove('phase-1', 'project-1', 'tenant-1');

      expect(result).toEqual({ message: 'Fase eliminada' });
      expect(phasesRepository.remove).toHaveBeenCalledWith(phase);
    });

    it('should throw BadRequestException if phase has tasks', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      phasesRepository.findOne.mockResolvedValue(mockPhase());
      tasksRepository.count.mockResolvedValue(2);

      await expect(
        service.remove('phase-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow('No se puede eliminar una fase con 2 tarea(s)');
    });

    it('should not call remove if phase has tasks', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      phasesRepository.findOne.mockResolvedValue(mockPhase());
      tasksRepository.count.mockResolvedValue(1);

      await expect(
        service.remove('phase-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow();

      expect(phasesRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if phase not found', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject());
      phasesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('phase-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // RECALCULATE PROJECT PROGRESS
  // ============================================
  describe('recalculateProjectProgress', () => {
    it('should compute progress based on completed phases', async () => {
      phasesRepository.find.mockResolvedValue([
        mockPhase({ status: PhaseStatus.COMPLETED }),
        mockPhase({ id: 'phase-2', status: PhaseStatus.COMPLETED }),
        mockPhase({ id: 'phase-3', status: PhaseStatus.IN_PROGRESS }),
        mockPhase({ id: 'phase-4', status: PhaseStatus.PENDING }),
      ]);
      projectsRepository.update.mockResolvedValue({ affected: 1 });

      await service.recalculateProjectProgress('project-1');

      // 2 de 4 = 50%
      expect(projectsRepository.update).toHaveBeenCalledWith('project-1', {
        progressPercentage: 50,
        totalTasks: 4,
        completedTasks: 2,
      });
    });

    it('should return early if no phases', async () => {
      phasesRepository.find.mockResolvedValue([]);

      await service.recalculateProjectProgress('project-1');

      expect(projectsRepository.update).not.toHaveBeenCalled();
    });

    it('should set 100% when all phases completed', async () => {
      phasesRepository.find.mockResolvedValue([
        mockPhase({ status: PhaseStatus.COMPLETED }),
        mockPhase({ id: 'phase-2', status: PhaseStatus.COMPLETED }),
      ]);
      projectsRepository.update.mockResolvedValue({ affected: 1 });

      await service.recalculateProjectProgress('project-1');

      expect(projectsRepository.update).toHaveBeenCalledWith('project-1', {
        progressPercentage: 100,
        totalTasks: 2,
        completedTasks: 2,
      });
    });

    it('should set 0% when no phases completed', async () => {
      phasesRepository.find.mockResolvedValue([
        mockPhase({ status: PhaseStatus.PENDING }),
        mockPhase({ id: 'phase-2', status: PhaseStatus.IN_PROGRESS }),
      ]);
      projectsRepository.update.mockResolvedValue({ affected: 1 });

      await service.recalculateProjectProgress('project-1');

      expect(projectsRepository.update).toHaveBeenCalledWith('project-1', {
        progressPercentage: 0,
        totalTasks: 2,
        completedTasks: 0,
      });
    });

    it('should query phases only by projectId', async () => {
      phasesRepository.find.mockResolvedValue([]);

      await service.recalculateProjectProgress('project-1');

      expect(phasesRepository.find).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
      });
    });
  });
});