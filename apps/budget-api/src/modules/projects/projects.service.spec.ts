// apps/budget-api/src/modules/projects/projects.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { ProjectsService } from './projects.service';
import {
  Project,
  ProjectStatus,
  ProjectPhase,
  PhaseStatus,
  ProjectMaterial,
  ProjectMaterialStatus,
  Budget,
  BudgetStatus,
  Worker,
} from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockProjectsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockPhasesRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const mockMaterialsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockBudgetsRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockWorkersRepository = {
  findOne: jest.fn(),
};

// Manager mockeado para transacciones
const mockManager = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn((cb: (m: any) => any) => cb(mockManager)),
};

// ============================================
// HELPERS
// ============================================
/**
 * Simula el auto-generated ID de TypeORM al hacer save.
 * Si el entity no tiene `id`, le asigna uno con el prefijo dado.
 */
const saveWithAutoId = (prefix: string) => {
  let counter = 0;
  return jest.fn().mockImplementation((entity) => {
    if (Array.isArray(entity)) {
      return Promise.resolve(
        entity.map((e) => (e.id ? e : { ...e, id: `${prefix}-${++counter}` })),
      );
    }
    return Promise.resolve(
      entity.id ? entity : { ...entity, id: `${prefix}-${++counter}` },
    );
  });
};

// ============================================
// TEST SUITE
// ============================================
describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: typeof mockProjectsRepository;
  let phasesRepository: typeof mockPhasesRepository;
  let materialsRepository: typeof mockMaterialsRepository;
  let budgetsRepository: typeof mockBudgetsRepository;
  let workersRepository: typeof mockWorkersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectsRepository,
        },
        {
          provide: getRepositoryToken(ProjectPhase),
          useValue: mockPhasesRepository,
        },
        {
          provide: getRepositoryToken(ProjectMaterial),
          useValue: mockMaterialsRepository,
        },
        {
          provide: getRepositoryToken(Budget),
          useValue: mockBudgetsRepository,
        },
        {
          provide: getRepositoryToken(Worker),
          useValue: mockWorkersRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectsRepository = module.get(getRepositoryToken(Project));
    phasesRepository = module.get(getRepositoryToken(ProjectPhase));
    materialsRepository = module.get(getRepositoryToken(ProjectMaterial));
    budgetsRepository = module.get(getRepositoryToken(Budget));
    workersRepository = module.get(getRepositoryToken(Worker));
  });

  afterEach(() => {
    jest.clearAllMocks();

    // Limpiar colas de mockResolvedValueOnce
    Object.values(mockProjectsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockPhasesRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockMaterialsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockBudgetsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockWorkersRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });

    mockManager.findOne.mockReset();
    mockManager.save.mockReset();
    mockManager.create.mockReset();

    // Restaurar el mock de transaction
    mockDataSource.transaction.mockImplementation((cb: any) => cb(mockManager));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // HELPERS DE ENTIDADES
  // ============================================
  const mockProject = (overrides: Partial<Project> = {}): Project =>
    ({
      id: 'project-1',
      tenantId: 'tenant-1',
      budgetId: 'budget-1',
      clientId: 'client-1',
      warehouseId: 'wh-1',
      projectManagerId: 'worker-1',
      projectNumber: 'PRJ-202609-00001',
      title: 'Instalación Solar',
      status: ProjectStatus.PLANNING,
      startDate: new Date('2026-09-01'),
      progressPercentage: 0,
      materialsCostActual: 0,
      laborCostActual: 0,
      additionalCostsActual: 0,
      totalCostActual: 0,
      ...overrides,
    }) as Project;

  const mockBudget = (overrides: Partial<Budget> = {}): Budget =>
    ({
      id: 'budget-1',
      tenantId: 'tenant-1',
      budgetNumber: 'BUD-202609-00001',
      status: BudgetStatus.APPROVED,
      convertedProjectId: null,
      convertedAt: null,
      clientId: 'client-1',
      warehouseId: 'wh-1',
      projectTitle: 'Instalación Solar 10kW',
      projectDescription: 'Paneles + inversor',
      siteAddress: 'Calle 123',
      siteCity: 'Madrid',
      siteState: 'Madrid',
      siteCountry: 'España',
      items: [
        {
          productId: 'prod-1',
          productName: 'Panel 400W',
          productSku: 'PNL-400',
          unitPrice: 200,
          quantity: 10,
        },
        {
          productId: 'prod-2',
          productName: 'Inversor 5kW',
          productSku: 'INV-5K',
          unitPrice: 800,
          quantity: 1,
        },
      ],
      laborItems: [],
      ...overrides,
    }) as unknown as Budget;

  const buildQueryBuilder = (data: any[], total?: number) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([data, total ?? data.length]),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(null),
  });

  // ============================================
  // CONVERT FROM BUDGET ⭐
  // ============================================
  describe('convertFromBudget', () => {
    const dto = {
      projectManagerId: 'worker-1',
      startDate: '2026-10-15',
    };

    const mockWorker = { id: 'worker-1', name: 'Ing. García' };

    const setupConvertSuccess = (budgetOverrides: Partial<Budget> = {}) => {
    const budget = mockBudget(budgetOverrides);
    const savedProject = mockProject({ id: 'project-new' });

    mockManager.findOne
      .mockResolvedValueOnce(budget)
      .mockResolvedValueOnce(mockWorker)
      .mockResolvedValueOnce(savedProject);

    // ✅ Solo el Project recibe 'project-new', el resto recibe ids genéricos
    mockManager.save.mockImplementation((entity) => {
      if (entity.projectNumber && !entity.id) {
        return Promise.resolve({ ...entity, id: 'project-new' });
      }
      if (!entity.id) {
        return Promise.resolve({ ...entity, id: `mock-${Date.now()}-${Math.random()}` });
      }
      return Promise.resolve(entity);
    });

  mockManager.create.mockImplementation((_, data) => data);
  projectsRepository.count.mockResolvedValue(0);

  return { budget, savedProject };
};

    it('should convert approved budget into project', async () => {
      setupConvertSuccess();

      const result = await service.convertFromBudget(
        'budget-1',
        dto,
        'tenant-1',
        'user-1',
      );

      expect(mockManager.create).toHaveBeenCalledWith(
        Project,
        expect.objectContaining({
          tenantId: 'tenant-1',
          budgetId: 'budget-1',
          clientId: 'client-1',
          projectManagerId: 'worker-1',
          createdById: 'user-1',
          status: ProjectStatus.PLANNING,
          title: 'Instalación Solar 10kW',
        }),
      );
      expect(result).toEqual(expect.objectContaining({ id: 'project-new' }));
    });

    it('should generate project number with format PRJ-YYYYMM-NNNNN', async () => {
      setupConvertSuccess();
      projectsRepository.count.mockResolvedValue(4);

      await service.convertFromBudget('budget-1', dto, 'tenant-1');

      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      expect(mockManager.create).toHaveBeenCalledWith(
        Project,
        expect.objectContaining({
          projectNumber: `PRJ-${year}${month}-00005`,
        }),
      );
    });

    it('should create phases when provided in dto', async () => {
      setupConvertSuccess();

      const dtoWithPhases = {
        ...dto,
        phases: [
          { name: 'Estudio', order: 1, estimatedDays: 2 },
          { name: 'Instalación', order: 2, estimatedDays: 5 },
        ],
      };

      await service.convertFromBudget('budget-1', dtoWithPhases, 'tenant-1');

      const phaseCreations = mockManager.create.mock.calls.filter(
        (call) => call[0] === ProjectPhase,
      );
      expect(phaseCreations).toHaveLength(2);
      expect(phaseCreations[0][1]).toMatchObject({
        name: 'Estudio',
        order: 1,
        estimatedDays: 2,
        status: PhaseStatus.PENDING,
      });
    });

    it('should create ProjectMaterials from budget items', async () => {
      setupConvertSuccess();

      await service.convertFromBudget('budget-1', dto, 'tenant-1');

      const materialCreations = mockManager.create.mock.calls.filter(
        (call) => call[0] === ProjectMaterial,
      );
      expect(materialCreations).toHaveLength(2);
      expect(materialCreations[0][1]).toMatchObject({
        productId: 'prod-1',
        productName: 'Panel 400W',
        unitPrice: 200,
        quantityPlanned: 10,
        quantityDelivered: 0,
        quantityUsed: 0,
        quantityReturned: 0,
        status: ProjectMaterialStatus.PLANNED,
      });
    });

    it('should mark budget as CONVERTED', async () => {
      const { budget } = setupConvertSuccess();

      await service.convertFromBudget('budget-1', dto, 'tenant-1');

      expect(budget.status).toBe(BudgetStatus.CONVERTED);
      expect(budget.convertedProjectId).toBe('project-new');
      expect((budget as any).convertedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if budget not found', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.convertFromBudget('budget-1', dto, 'tenant-1'),
      ).rejects.toThrow('Presupuesto budget-1 no encontrado');
    });

    it('should throw BadRequestException if budget not approved', async () => {
      setupConvertSuccess({ status: BudgetStatus.DRAFT });

      await expect(
        service.convertFromBudget('budget-1', dto, 'tenant-1'),
      ).rejects.toThrow('Solo se pueden convertir presupuestos aprobados');
    });

    it('should throw BadRequestException if already converted', async () => {
      setupConvertSuccess({ convertedProjectId: 'existing-project' });

      await expect(
        service.convertFromBudget('budget-1', dto, 'tenant-1'),
      ).rejects.toThrow('ya fue convertido en proyecto');
    });

    it('should throw BadRequestException if project manager not found', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockBudget()) // Budget OK
        .mockResolvedValueOnce(null); // Worker no existe

      await expect(
        service.convertFromBudget('budget-1', dto, 'tenant-1'),
      ).rejects.toThrow('Project Manager no encontrado');
    });

    it('should handle budget with no items (only phases)', async () => {
      setupConvertSuccess({ items: [] });

      const dtoWithPhases = {
        ...dto,
        phases: [{ name: 'Única fase', order: 1, estimatedDays: 3 }],
      };

      await service.convertFromBudget('budget-1', dtoWithPhases, 'tenant-1');

      const materialCreations = mockManager.create.mock.calls.filter(
        (call) => call[0] === ProjectMaterial,
      );
      expect(materialCreations).toHaveLength(0);
    });

    it('should handle estimatedEndDate if provided', async () => {
      setupConvertSuccess();

      await service.convertFromBudget(
        'budget-1',
        { ...dto, estimatedEndDate: '2026-12-31' },
        'tenant-1',
      );

      expect(mockManager.create).toHaveBeenCalledWith(
        Project,
        expect.objectContaining({
          estimatedEndDate: expect.any(Date),
        }),
      );
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should filter by tenantId', async () => {
      const qb = buildQueryBuilder([]);
      projectsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.where).toHaveBeenCalledWith('project.tenantId = :tenantId', {
        tenantId: 'tenant-1',
      });
    });

    it('should apply pagination', async () => {
      const qb = buildQueryBuilder([]);
      projectsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 3, limit: 5 }, 'tenant-1');

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should filter by status', async () => {
      const qb = buildQueryBuilder([]);
      projectsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ status: ProjectStatus.IN_PROGRESS }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith('project.status = :status', {
        status: ProjectStatus.IN_PROGRESS,
      });
    });

    it('should filter by clientId, budgetId, projectManagerId', async () => {
      const qb = buildQueryBuilder([]);
      projectsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        {
          clientId: 'cli-1',
          budgetId: 'bud-1',
          projectManagerId: 'pm-1',
        },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'project.clientId = :clientId',
        { clientId: 'cli-1' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'project.budgetId = :budgetId',
        { budgetId: 'bud-1' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'project.projectManagerId = :pmId',
        { pmId: 'pm-1' },
      );
    });

    it('should apply search', async () => {
      const qb = buildQueryBuilder([]);
      projectsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'PRJ-2026' }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%PRJ-2026%' },
      );
    });

    it('should apply date range', async () => {
      const qb = buildQueryBuilder([]);
      projectsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { from: '2026-01-01', to: '2026-12-31' },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'project.startDate BETWEEN :from AND :to',
        { from: '2026-01-01', to: '2026-12-31' },
      );
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return project with all relations', async () => {
      const project = mockProject();
      projectsRepository.findOne.mockResolvedValue(project);

      const result = await service.findOne('project-1', 'tenant-1');

      expect(result).toEqual(project);
      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'project-1', tenantId: 'tenant-1' },
        relations: [
          'client',
          'projectManager',
          'phases',
          'phases.tasks',
          'phases.tasks.worker',
          'materials',
          'materials.assignedToWorker',
          'createdBy',
          'completedBy',
        ],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('project-1', 'tenant-1'),
      ).rejects.toThrow('Proyecto project-1 no encontrado');
    });
  });

  // ============================================
  // FIND BY NUMBER
  // ============================================
  describe('findByNumber', () => {
    it('should return project by number', async () => {
      const project = mockProject();
      projectsRepository.findOne.mockResolvedValue(project);

      const result = await service.findByNumber('PRJ-202609-00001', 'tenant-1');

      expect(result).toEqual(project);
      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { projectNumber: 'PRJ-202609-00001', tenantId: 'tenant-1' },
        relations: ['client', 'projectManager', 'phases', 'materials'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByNumber('PRJ-999999', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should update planning project', async () => {
      const project = mockProject();
      projectsRepository.findOne.mockResolvedValue(project);
      projectsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update(
        'project-1',
        { title: 'Nuevo título' },
        'tenant-1',
      );

      expect(result.title).toBe('Nuevo título');
    });

    it('should convert date strings to Date', async () => {
      const project = mockProject();
      projectsRepository.findOne.mockResolvedValue(project);
      projectsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update(
        'project-1',
        { startDate: '2026-11-01', estimatedEndDate: '2026-12-31' },
        'tenant-1',
      );

      expect(project.startDate).toBeInstanceOf(Date);
      expect(project.estimatedEndDate).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException if COMPLETED', async () => {
      projectsRepository.findOne.mockResolvedValue(
        mockProject({ status: ProjectStatus.COMPLETED }),
      );

      await expect(
        service.update('project-1', { title: 'x' }, 'tenant-1'),
      ).rejects.toThrow('No se puede editar un proyecto en estado completed');
    });

    it('should throw BadRequestException if CANCELLED', async () => {
      projectsRepository.findOne.mockResolvedValue(
        mockProject({ status: ProjectStatus.CANCELLED }),
      );

      await expect(
        service.update('project-1', { title: 'x' }, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // START / PAUSE / RESUME
  // ============================================
  describe('start', () => {
    it('should start a PLANNING project', async () => {
      const project = mockProject({ status: ProjectStatus.PLANNING });
      projectsRepository.findOne.mockResolvedValue(project);
      projectsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.start('project-1', 'tenant-1');

      expect(result.status).toBe(ProjectStatus.IN_PROGRESS);
      expect(result.startedAt).toBeInstanceOf(Date);
    });

    it('should set startDate if not set', async () => {
      const project = mockProject({
        status: ProjectStatus.PLANNING,
        startDate: undefined,
      });
      projectsRepository.findOne.mockResolvedValue(project);
      projectsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.start('project-1', 'tenant-1');

      expect(project.startDate).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException if not PLANNING', async () => {
      projectsRepository.findOne.mockResolvedValue(
        mockProject({ status: ProjectStatus.IN_PROGRESS }),
      );

      await expect(service.start('project-1', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('pause', () => {
    it('should pause an IN_PROGRESS project', async () => {
      const project = mockProject({ status: ProjectStatus.IN_PROGRESS });
      projectsRepository.findOne.mockResolvedValue(project);
      projectsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.pause('project-1', 'tenant-1');

      expect(result.status).toBe(ProjectStatus.PAUSED);
      expect(result.pausedAt).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException if not IN_PROGRESS', async () => {
      projectsRepository.findOne.mockResolvedValue(
        mockProject({ status: ProjectStatus.PLANNING }),
      );

      await expect(service.pause('project-1', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resume', () => {
    it('should resume a PAUSED project', async () => {
      const project = mockProject({ status: ProjectStatus.PAUSED });
      projectsRepository.findOne.mockResolvedValue(project);
      projectsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.resume('project-1', 'tenant-1');

      expect(result.status).toBe(ProjectStatus.IN_PROGRESS);
    });

    it('should throw BadRequestException if not PAUSED', async () => {
      projectsRepository.findOne.mockResolvedValue(
        mockProject({ status: ProjectStatus.IN_PROGRESS }),
      );

      await expect(service.resume('project-1', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================
  // COMPLETE ⭐
  // ============================================
  describe('complete', () => {
    const setupComplete = (pendingCount = 0) => {
      const project = mockProject({ status: ProjectStatus.IN_PROGRESS });
      projectsRepository.findOne.mockResolvedValue(project);
      materialsRepository.count.mockResolvedValue(pendingCount);
      projectsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '1500.50' }),
      };
      materialsRepository.createQueryBuilder.mockReturnValue(qb);

      return project;
    };

    it('should complete project and set costs', async () => {
      const project = setupComplete(0);

      const result = await service.complete(
        'project-1',
        'tenant-1',
        'user-1',
        'Todo OK',
      );

      expect(result.status).toBe(ProjectStatus.COMPLETED);
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.actualEndDate).toBeInstanceOf(Date);
      expect(result.completedById).toBe('user-1');
      expect(result.progressPercentage).toBe(100);
      expect(result.closeNotes).toBe('Todo OK');
      expect(result.materialsCostActual).toBe(1500.5);
    });

    it('should throw BadRequestException if pending materials exist', async () => {
      setupComplete(3);

      await expect(
        service.complete('project-1', 'tenant-1'),
      ).rejects.toThrow('Hay 3 material(es) sin devolver');
    });

    it('should throw BadRequestException if not IN_PROGRESS', async () => {
      projectsRepository.findOne.mockResolvedValue(
        mockProject({ status: ProjectStatus.PLANNING }),
      );

      await expect(
        service.complete('project-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should query pending materials with correct statuses', async () => {
      setupComplete(0);

      await service.complete('project-1', 'tenant-1');

      expect(materialsRepository.count).toHaveBeenCalledWith({
        where: [
          { projectId: 'project-1', status: ProjectMaterialStatus.DELIVERED },
          {
            projectId: 'project-1',
            status: ProjectMaterialStatus.PARTIALLY_USED,
          },
        ],
      });
    });

    it('should handle project with no materials cost', async () => {
      const project = mockProject({ status: ProjectStatus.IN_PROGRESS });
      projectsRepository.findOne.mockResolvedValue(project);
      materialsRepository.count.mockResolvedValue(0);
      projectsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      };
      materialsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.complete('project-1', 'tenant-1');

      expect(result.materialsCostActual).toBe(0);
    });
  });

  // ============================================
  // CANCEL
  // ============================================
  describe('cancel', () => {
    it('should cancel a planning project', async () => {
      const project = mockProject({ status: ProjectStatus.PLANNING });
      projectsRepository.findOne.mockResolvedValue(project);
      projectsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.cancel(
        'project-1',
        'tenant-1',
        'Cliente canceló',
      );

      expect(result.status).toBe(ProjectStatus.CANCELLED);
      expect(result.cancelledAt).toBeInstanceOf(Date);
      expect(result.closeNotes).toBe('Cliente canceló');
    });

    it('should cancel IN_PROGRESS project', async () => {
      const project = mockProject({ status: ProjectStatus.IN_PROGRESS });
      projectsRepository.findOne.mockResolvedValue(project);
      projectsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.cancel('project-1', 'tenant-1', 'motivo');

      expect(result.status).toBe(ProjectStatus.CANCELLED);
    });

    it('should throw BadRequestException if COMPLETED', async () => {
      projectsRepository.findOne.mockResolvedValue(
        mockProject({ status: ProjectStatus.COMPLETED }),
      );

      await expect(
        service.cancel('project-1', 'tenant-1', 'motivo'),
      ).rejects.toThrow('No se puede cancelar un proyecto en estado completed');
    });

    it('should throw BadRequestException if already CANCELLED', async () => {
      projectsRepository.findOne.mockResolvedValue(
        mockProject({ status: ProjectStatus.CANCELLED }),
      );

      await expect(
        service.cancel('project-1', 'tenant-1', 'motivo'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove a PLANNING project', async () => {
      const project = mockProject({ status: ProjectStatus.PLANNING });
      projectsRepository.findOne.mockResolvedValue(project);
      projectsRepository.remove.mockResolvedValue(project);

      const result = await service.remove('project-1', 'tenant-1');

      expect(result).toEqual({ message: 'Proyecto eliminado' });
      expect(projectsRepository.remove).toHaveBeenCalledWith(project);
    });

    it('should throw BadRequestException if not PLANNING', async () => {
      projectsRepository.findOne.mockResolvedValue(
        mockProject({ status: ProjectStatus.IN_PROGRESS }),
      );

      await expect(service.remove('project-1', 'tenant-1')).rejects.toThrow(
        'Solo se pueden eliminar proyectos en planificación',
      );
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return full statistics', async () => {
      projectsRepository.count.mockResolvedValue(15);

      const byStatusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'planning', count: '3' },
          { status: 'in_progress', count: '7' },
          { status: 'completed', count: '5' },
        ]),
      };

      const totalsQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest
          .fn()
          .mockResolvedValue({ totalCost: '50000', avgProgress: '45.5' }),
      };

      projectsRepository.createQueryBuilder
        .mockReturnValueOnce(byStatusQb)
        .mockReturnValueOnce(totalsQb);

      projectsRepository.find.mockResolvedValue([
        {
          id: 'p1',
          startDate: new Date('2026-01-01'),
          actualEndDate: new Date('2026-01-11'), // 10 días
        },
        {
          id: 'p2',
          startDate: new Date('2026-02-01'),
          actualEndDate: new Date('2026-02-21'), // 20 días
        },
      ]);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(15);
      expect(result.byStatus).toHaveLength(3);
      expect(result.totalCostActual).toBe(50000);
      expect(result.avgProgress).toBe(45.5);
      expect(result.avgDurationDays).toBe(15); // (10 + 20) / 2
    });

    it('should return zeros when no data', async () => {
      projectsRepository.count.mockResolvedValue(0);

      const emptyQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue(null),
      };
      projectsRepository.createQueryBuilder.mockReturnValue(emptyQb);
      projectsRepository.find.mockResolvedValue([]);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(0);
      expect(result.totalCostActual).toBe(0);
      expect(result.avgProgress).toBe(0);
      expect(result.avgDurationDays).toBe(0);
    });

    it('should handle completed projects without dates', async () => {
      projectsRepository.count.mockResolvedValue(2);

      const byStatusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      const totalsQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest
          .fn()
          .mockResolvedValue({ totalCost: '0', avgProgress: '0' }),
      };

      projectsRepository.createQueryBuilder
        .mockReturnValueOnce(byStatusQb)
        .mockReturnValueOnce(totalsQb);

      projectsRepository.find.mockResolvedValue([
        { id: 'p1', startDate: null, actualEndDate: null },
        { id: 'p2', startDate: null, actualEndDate: null },
      ]);

      const result = await service.getStats('tenant-1');

      expect(result.avgDurationDays).toBe(0);
    });
  });
});