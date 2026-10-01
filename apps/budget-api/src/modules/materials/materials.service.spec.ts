// apps/budget-api/src/modules/materials/materials.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { MaterialsService } from './materials.service';
import {
  Project,
  ProjectMaterial,
  ProjectMaterialStatus,
  Stock,
  Movement,
  MovementType,
  Worker,
} from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockMaterialsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockProjectsRepository = {
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
// TEST SUITE
// ============================================
describe('MaterialsService', () => {
  let service: MaterialsService;
  let materialsRepository: typeof mockMaterialsRepository;
  let projectsRepository: typeof mockProjectsRepository;
  let workersRepository: typeof mockWorkersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsService,
        {
          provide: getRepositoryToken(ProjectMaterial),
          useValue: mockMaterialsRepository,
        },
        { provide: getRepositoryToken(Project), useValue: mockProjectsRepository },
        { provide: getRepositoryToken(Worker), useValue: mockWorkersRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
    materialsRepository = module.get(getRepositoryToken(ProjectMaterial));
    projectsRepository = module.get(getRepositoryToken(Project));
    workersRepository = module.get(getRepositoryToken(Worker));
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockDataSource.transaction.mockImplementation((cb: any) => cb(mockManager));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // HELPERS
  // ============================================
  const mockProject = { id: 'project-1', tenantId: 'tenant-1' };

  const mockMaterial = (overrides = {}) => ({
    id: 'mat-1',
    projectId: 'project-1',
    // ✅ project incluido para evitar TypeError en material.project.projectNumber
    project: { id: 'project-1', projectNumber: 'PRJ-2026-001' },
    productId: 'prod-1',
    warehouseId: 'wh-1',
    productName: 'Cable 2.5mm',
    productSku: 'CBL-25',
    unitPrice: 2.5,
    quantityPlanned: 100,
    quantityDelivered: 0,
    quantityUsed: 0,
    quantityReturned: 0,
    status: ProjectMaterialStatus.PLANNED,
    assignedToWorkerId: undefined,
    notes: null,
    ...overrides,
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should verify project and return materials with totals', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);

      const materials = [
        mockMaterial({ status: ProjectMaterialStatus.DELIVERED }),
        mockMaterial({ id: 'mat-2' }),
      ];
      materialsRepository.find.mockResolvedValue(materials);

      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest
          .fn()
          .mockResolvedValue({ plannedCost: '250.00', usedCost: '175.00' }),
      };
      materialsRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll('project-1', 'tenant-1');

      expect(result.data).toEqual(materials);
      expect(result.totals.plannedCost).toBe(250);
      expect(result.totals.usedCost).toBe(175);
    });

    it('should filter by status when provided', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      materialsRepository.find.mockResolvedValue([]);

      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({}),
      };
      materialsRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll(
        'project-1',
        'tenant-1',
        ProjectMaterialStatus.DELIVERED,
      );

      expect(materialsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId: 'project-1',
            status: ProjectMaterialStatus.DELIVERED,
          },
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
    it('should return material with relations', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      const material = mockMaterial();
      materialsRepository.findOne.mockResolvedValue(material);

      const result = await service.findOne('mat-1', 'project-1', 'tenant-1');

      expect(result).toEqual(material);
      expect(materialsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'mat-1', projectId: 'project-1' },
        relations: ['assignedToWorker', 'product', 'warehouse'],
      });
    });

    it('should throw NotFoundException if material not found', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      materialsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('mat-1', 'project-1', 'tenant-1'),
      ).rejects.toThrow('Material mat-1 no encontrado');
    });
  });

  // ============================================
  // DELIVER
  // ============================================
  describe('deliver', () => {
    const dto = { workerId: 'worker-1', quantityDelivered: 100 };

    beforeEach(() => {
      mockManager.findOne.mockReset();
      mockManager.save.mockReset();
      mockManager.create.mockReset();
    });

    const setupDeliverSuccess = () => {
      const material = mockMaterial({ status: ProjectMaterialStatus.PLANNED });
      const worker = { id: 'worker-1', name: 'Juan Pérez' };
      const stock = { id: 'stock-1', quantity: 200 };

      mockManager.findOne
        .mockResolvedValueOnce(material) // material
        .mockResolvedValueOnce(worker)   // worker
        .mockResolvedValueOnce(stock)    // stock
        .mockResolvedValueOnce({
          ...material,
          status: ProjectMaterialStatus.DELIVERED,
        }); // return final

      mockManager.save.mockImplementation((entity) => Promise.resolve(entity));
      mockManager.create.mockImplementation((_, data) => data);

      return { material, worker, stock };
    };

    it('should deliver material and decrement stock', async () => {
      const { stock } = setupDeliverSuccess();

      const result = await service.deliver(
        'mat-1',
        dto,
        'project-1',
        'tenant-1',
        'user-1',
      );

      // Stock decrementado: 200 - 100 = 100
      expect(stock.quantity).toBe(100);
      expect(mockManager.save).toHaveBeenCalledWith(stock);
      expect(result.status).toBe(ProjectMaterialStatus.DELIVERED);
    });

    it('should create CONSUMPTION movement with correct snapshot', async () => {
      setupDeliverSuccess();

      await service.deliver('mat-1', dto, 'project-1', 'tenant-1', 'user-1');

      const movementCall = mockManager.create.mock.calls.find(
        (call) => call[0] === Movement,
      );
      expect(movementCall).toBeDefined();
      expect(movementCall![1]).toMatchObject({
        type: MovementType.CONSUMPTION,
        quantity: -100,
        stockBefore: 200,
        stockAfter: 100,
        referenceType: 'project_material',
        referenceId: 'mat-1',
        userId: 'user-1',
      });
      // ✅ Verifica que usa projectNumber correctamente
      expect(movementCall![1].reason).toContain('PRJ-2026-001');
      expect(movementCall![1].reason).toContain('Juan Pérez');
    });

    it('should update material status, deliveredAt and append notes', async () => {
      setupDeliverSuccess();

      await service.deliver(
        'mat-1',
        { ...dto, notes: 'Entregado en obra' },
        'project-1',
        'tenant-1',
      );

      const saved = mockManager.save.mock.calls.find(
        (call) =>
          call[0]?.id === 'mat-1' &&
          call[0]?.status === ProjectMaterialStatus.DELIVERED,
      );
      expect(saved).toBeDefined();
      expect(saved![0].quantityDelivered).toBe(100);
      expect(saved![0].assignedToWorkerId).toBe('worker-1');
      expect(saved![0].deliveredAt).toBeInstanceOf(Date);
      expect(saved![0].notes).toContain('[Entrega]: Entregado en obra');
    });

    it('should throw NotFoundException if material not found', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        service.deliver('mat-1', dto, 'project-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not PLANNED', async () => {
      mockManager.findOne.mockResolvedValueOnce(
        mockMaterial({ status: ProjectMaterialStatus.DELIVERED }),
      );

      await expect(
        service.deliver('mat-1', dto, 'project-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if worker not found', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockMaterial())
        .mockResolvedValueOnce(null); // worker no encontrado

      await expect(
        service.deliver('mat-1', dto, 'project-1', 'tenant-1'),
      ).rejects.toThrow('Worker no encontrado');
    });

    it('should throw BadRequestException if delivered > planned', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockMaterial({ quantityPlanned: 50 }))
        .mockResolvedValueOnce({ id: 'worker-1', name: 'Juan' });

      await expect(
        service.deliver(
          'mat-1',
          { workerId: 'worker-1', quantityDelivered: 100 },
          'project-1',
          'tenant-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if stock not found', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockMaterial())
        .mockResolvedValueOnce({ id: 'worker-1', name: 'Juan' })
        .mockResolvedValueOnce(null); // stock no encontrado

      await expect(
        service.deliver('mat-1', dto, 'project-1', 'tenant-1'),
      ).rejects.toThrow('Stock insuficiente');
    });

    it('should throw BadRequestException if stock insufficient', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockMaterial())
        .mockResolvedValueOnce({ id: 'worker-1', name: 'Juan' })
        .mockResolvedValueOnce({ id: 'stock-1', quantity: 50 });

      await expect(
        service.deliver('mat-1', dto, 'project-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle string quantities (bug fix Number())', async () => {
      const material = mockMaterial({
        quantityPlanned: '100.00' as any,
        quantityDelivered: 0,
      });
      const worker = { id: 'worker-1', name: 'Juan' };
      const stock = { id: 'stock-1', quantity: '200' as any };

      mockManager.findOne
        .mockResolvedValueOnce(material)
        .mockResolvedValueOnce(worker)
        .mockResolvedValueOnce(stock)
        .mockResolvedValueOnce(material);
      mockManager.save.mockImplementation((e) => Promise.resolve(e));
      mockManager.create.mockImplementation((_, d) => d);

      await service.deliver(
        'mat-1',
        { workerId: 'worker-1', quantityDelivered: 100 },
        'project-1',
        'tenant-1',
      );

      // 200 (string) - 100 = 100 (number, no concatenación)
      expect(stock.quantity).toBe(100);
    });
  });

  // ============================================
  // USE
  // ============================================
  describe('use', () => {
    const dto = { quantityUsed: 70 };

    const setupUse = (materialOverrides = {}) => {
      const material = mockMaterial({
        status: ProjectMaterialStatus.DELIVERED,
        quantityDelivered: 100,
        quantityUsed: 0,
        ...materialOverrides,
      });

      // findOne (verifyProject) → proyecto | findOne final → material actualizado
      projectsRepository.findOne
        .mockResolvedValueOnce(mockProject) // verifyProject
        .mockResolvedValueOnce({
          id: 'project-1',
          materialsCostActual: 0,
          laborCostActual: '200.00',
          additionalCostsActual: '500.00',
        });

      materialsRepository.findOne
        .mockResolvedValueOnce(material)
        .mockResolvedValueOnce({ ...material, quantityUsed: 70 });

      materialsRepository.save.mockImplementation((e) => Promise.resolve(e));

      // recalculateProjectMaterialsCost → createQueryBuilder
      const recalcQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '175.00' }),
      };
      materialsRepository.createQueryBuilder.mockReturnValue(recalcQb);

      return material;
    };

    it('should set status PARTIALLY_USED when used < delivered', async () => {
      setupUse();

      await service.use('mat-1', dto, 'project-1', 'tenant-1');

      const saved = materialsRepository.save.mock.calls[0][0];
      expect(saved.quantityUsed).toBe(70);
      expect(saved.costActual).toBe(175); // 70 * 2.5
      expect(saved.status).toBe(ProjectMaterialStatus.PARTIALLY_USED);
    });

    it('should set status CONSUMED when used >= delivered', async () => {
      setupUse();

      await service.use('mat-1', { quantityUsed: 100 }, 'project-1', 'tenant-1');

      const saved = materialsRepository.save.mock.calls[0][0];
      expect(saved.status).toBe(ProjectMaterialStatus.CONSUMED);
    });

    it('should append notes when provided', async () => {
      setupUse();

      await service.use(
        'mat-1',
        { quantityUsed: 70, notes: 'Instalado en techo' },
        'project-1',
        'tenant-1',
      );

      const saved = materialsRepository.save.mock.calls[0][0];
      expect(saved.notes).toContain('[Uso]: Instalado en techo');
    });

    it('should recalculate project materials cost', async () => {
      setupUse();

      await service.use('mat-1', dto, 'project-1', 'tenant-1');

      // Verifica que se llamó al recalculate (save del proyecto)
      expect(projectsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          materialsCostActual: 175,
          totalCostActual: 875, // 175 + 200 + 500
        }),
      );
    });

    it('should throw BadRequestException if status not DELIVERED/PARTIALLY_USED', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      materialsRepository.findOne.mockResolvedValue(
        mockMaterial({ status: ProjectMaterialStatus.PLANNED }),
      );

      await expect(
        service.use('mat-1', dto, 'project-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if used > delivered', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      materialsRepository.findOne.mockResolvedValue(
        mockMaterial({
          status: ProjectMaterialStatus.DELIVERED,
          quantityDelivered: 50,
        }),
      );

      await expect(
        service.use('mat-1', { quantityUsed: 100 }, 'project-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle string quantityUsed (Number() fix)', async () => {
      projectsRepository.findOne
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(mockProject);

      materialsRepository.findOne
        .mockResolvedValueOnce(
          mockMaterial({
            status: ProjectMaterialStatus.DELIVERED,
            quantityDelivered: 100,
          }),
        )
        .mockResolvedValueOnce({});

      materialsRepository.save.mockImplementation((e) => Promise.resolve(e));

      const recalcQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      };
      materialsRepository.createQueryBuilder.mockReturnValue(recalcQb);

      await service.use(
        'mat-1',
        { quantityUsed: '70' as any },
        'project-1',
        'tenant-1',
      );

      const saved = materialsRepository.save.mock.calls[0][0];
      expect(saved.quantityUsed).toBe(70); // number, no string
    });
  });

  // ============================================
  // RETURN MATERIAL
  // ============================================
  describe('returnMaterial', () => {
    beforeEach(() => {
      mockManager.findOne.mockReset();
      mockManager.save.mockReset();
      mockManager.create.mockReset();
    });

    /**
     * Caso estrella del resumen:
     * 100 entregados, 70 usados, 30 devueltos → stock vuelve +30 y estado RETURNED
     */
    const setupReturnSuccess = (overrides = {}) => {
      const material = mockMaterial({
        status: ProjectMaterialStatus.PARTIALLY_USED,
        quantityDelivered: 100,
        quantityUsed: 70,
        quantityReturned: 0,
        ...overrides,
      });
      const stock = { id: 'stock-1', quantity: 50 };

      mockManager.findOne
        .mockResolvedValueOnce(material)
        .mockResolvedValueOnce(stock)
        .mockResolvedValueOnce({ ...material, quantityReturned: 30 });

      mockManager.save.mockImplementation((e) => Promise.resolve(e));
      mockManager.create.mockImplementation((_, d) => d);

      // recalculateProjectMaterialsCost usa materialsRepository (no manager)
      materialsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '175.00' }),
      });
      projectsRepository.findOne.mockResolvedValue({
        id: 'project-1',
        materialsCostActual: 0,
        laborCostActual: '200.00',
        additionalCostsActual: '500.00',
      });

      return { material, stock };
    };

    it('should return 30 units to stock (100 planned, 70 used, 30 returned)', async () => {
      const { stock } = setupReturnSuccess();

      await service.returnMaterial(
        'mat-1',
        { quantityReturned: 30 },
        'project-1',
        'tenant-1',
        'user-1',
      );

      expect(stock.quantity).toBe(80); // 50 + 30
      expect(mockManager.save).toHaveBeenCalledWith(stock);
    });

    it('should create PROJECT_RETURN movement', async () => {
      setupReturnSuccess();

      await service.returnMaterial(
        'mat-1',
        { quantityReturned: 30 },
        'project-1',
        'tenant-1',
        'user-1',
      );

      const movementCall = mockManager.create.mock.calls.find(
        (call) => call[0] === Movement,
      );
      expect(movementCall![1]).toMatchObject({
        type: MovementType.PROJECT_RETURN,
        quantity: 30,
        stockBefore: 50,
        stockAfter: 80,
        referenceId: 'mat-1',
      });
      // ✅ Verifica que usa projectNumber correctamente
      expect(movementCall![1].reason).toContain('PRJ-2026-001');
    });

    it('should set status RETURNED when used + returned >= delivered', async () => {
      setupReturnSuccess();

      await service.returnMaterial(
        'mat-1',
        { quantityReturned: 30 },
        'project-1',
        'tenant-1',
      );

      const saved = mockManager.save.mock.calls.find(
        (call) =>
          call[0]?.id === 'mat-1' && call[0]?.quantityReturned !== undefined,
      );
      expect(saved![0].status).toBe(ProjectMaterialStatus.RETURNED);
      expect(saved![0].quantityReturned).toBe(30);
    });

    it('should NOT set RETURNED if sobrante still pending', async () => {
      const material = mockMaterial({
        status: ProjectMaterialStatus.PARTIALLY_USED,
        quantityDelivered: 100,
        quantityUsed: 40,
        quantityReturned: 0,
      });
      const stock = { id: 'stock-1', quantity: 50 };

      mockManager.findOne
        .mockResolvedValueOnce(material)
        .mockResolvedValueOnce(stock)
        .mockResolvedValueOnce(material);
      mockManager.save.mockImplementation((e) => Promise.resolve(e));
      mockManager.create.mockImplementation((_, d) => d);

      materialsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '100' }),
      });
      projectsRepository.findOne.mockResolvedValue(mockProject);

      await service.returnMaterial(
        'mat-1',
        { quantityReturned: 20 },
        'project-1',
        'tenant-1',
      );

      const saved = mockManager.save.mock.calls.find(
        (call) =>
          call[0]?.id === 'mat-1' && call[0]?.quantityReturned !== undefined,
      );
      // 40 + 20 = 60 < 100 → NO debe ser RETURNED
      expect(saved![0].status).not.toBe(ProjectMaterialStatus.RETURNED);
    });

    it('should throw BadRequestException if quantityReturned exceeds available', async () => {
      const material = mockMaterial({
        status: ProjectMaterialStatus.PARTIALLY_USED,
        quantityDelivered: 100,
        quantityUsed: 70,
        quantityReturned: 0,
      });
      mockManager.findOne.mockResolvedValueOnce(material);

      await expect(
        service.returnMaterial(
          'mat-1',
          { quantityReturned: 50 }, // solo quedan 30
          'project-1',
          'tenant-1',
        ),
      ).rejects.toThrow('excede el sobrante disponible');
    });

    it('should throw BadRequestException if status not allowed', async () => {
      mockManager.findOne.mockResolvedValueOnce(
        mockMaterial({ status: ProjectMaterialStatus.PLANNED }),
      );

      await expect(
        service.returnMaterial(
          'mat-1',
          { quantityReturned: 30 },
          'project-1',
          'tenant-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accumulate returned quantity across multiple calls', async () => {
      const material = mockMaterial({
        status: ProjectMaterialStatus.PARTIALLY_USED,
        quantityDelivered: 100,
        quantityUsed: 40,
        quantityReturned: 20, // ya devolvió 20 antes
      });
      const stock = { id: 'stock-1', quantity: 50 };

      mockManager.findOne
        .mockResolvedValueOnce(material)
        .mockResolvedValueOnce(stock)
        .mockResolvedValueOnce(material);
      mockManager.save.mockImplementation((e) => Promise.resolve(e));
      mockManager.create.mockImplementation((_, d) => d);

      materialsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '100' }),
      });
      projectsRepository.findOne.mockResolvedValue(mockProject);

      // Devolver 30 más → total 50, sobrante era 40 (100-40-20)
      await service.returnMaterial(
        'mat-1',
        { quantityReturned: 30 },
        'project-1',
        'tenant-1',
      );

      const saved = mockManager.save.mock.calls.find(
        (call) =>
          call[0]?.id === 'mat-1' && call[0]?.quantityReturned === 50,
      );
      expect(saved).toBeDefined();
    });

    it('should handle the 0.01 quantityReturned bug (Number() fix)', async () => {
      const material = mockMaterial({
        status: ProjectMaterialStatus.PARTIALLY_USED,
        quantityDelivered: 100,
        quantityUsed: 70,
        quantityReturned: 0,
      });
      const stock = { id: 'stock-1', quantity: 50 };

      mockManager.findOne
        .mockResolvedValueOnce(material)
        .mockResolvedValueOnce(stock)
        .mockResolvedValueOnce(material);
      mockManager.save.mockImplementation((e) => Promise.resolve(e));
      mockManager.create.mockImplementation((_, d) => d);

      materialsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      });
      projectsRepository.findOne.mockResolvedValue(mockProject);

      // Bug histórico: "0.01" se concatenaba como string
      await service.returnMaterial(
        'mat-1',
        { quantityReturned: '0.01' as any },
        'project-1',
        'tenant-1',
      );

      const saved = mockManager.save.mock.calls.find(
        (call) =>
          call[0]?.id === 'mat-1' && call[0]?.quantityReturned !== undefined,
      );
      // Debe ser 0.01 (number), no "0.01" (string) ni "00.01"
      expect(saved![0].quantityReturned).toBe(0.01);
      expect(typeof saved![0].quantityReturned).toBe('number');
    });

    it('should throw NotFoundException if material not found', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        service.returnMaterial(
          'mat-1',
          { quantityReturned: 30 },
          'project-1',
          'tenant-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // REPORT LOST
  // ============================================
  describe('reportLost', () => {
    it('should add lost quantity to quantityUsed and set status LOST', async () => {
      projectsRepository.findOne
        .mockResolvedValueOnce(mockProject) // verifyProject
        .mockResolvedValueOnce(mockProject); // recalculate

      const material = mockMaterial({
        status: ProjectMaterialStatus.DELIVERED,
        quantityDelivered: 100,
        quantityUsed: 0,
        quantityReturned: 0,
        unitPrice: 2.5,
      });
      materialsRepository.findOne
        .mockResolvedValueOnce(material)
        .mockResolvedValueOnce({
          ...material,
          status: ProjectMaterialStatus.LOST,
        });
      materialsRepository.save.mockImplementation((e) => Promise.resolve(e));

      materialsRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      });

      await service.reportLost(
        'mat-1',
        { quantityLost: 5, reason: 'Cable dañado' },
        'project-1',
        'tenant-1',
      );

      const saved = materialsRepository.save.mock.calls[0][0];
      expect(saved.quantityUsed).toBe(5);
      expect(saved.costActual).toBe(12.5); // 5 * 2.5
      expect(saved.status).toBe(ProjectMaterialStatus.LOST);
      expect(saved.notes).toContain('[Pérdida]: Cable dañado');
    });

    it('should throw BadRequestException if lost exceeds available', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      materialsRepository.findOne.mockResolvedValue(
        mockMaterial({
          status: ProjectMaterialStatus.DELIVERED,
          quantityDelivered: 100,
          quantityUsed: 90,
          quantityReturned: 5,
        }),
      );

      await expect(
        service.reportLost(
          'mat-1',
          { quantityLost: 10, reason: 'Perdido' },
          'project-1',
          'tenant-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if status not allowed', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      materialsRepository.findOne.mockResolvedValue(
        mockMaterial({ status: ProjectMaterialStatus.PLANNED }),
      );

      await expect(
        service.reportLost(
          'mat-1',
          { quantityLost: 5, reason: 'X' },
          'project-1',
          'tenant-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return totals and byStatus', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      materialsRepository.find.mockResolvedValue([
        mockMaterial(),
        mockMaterial(),
      ]);

      const byStatusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'planned', count: '1' },
          { status: 'delivered', count: '1' },
        ]),
      };

      const totalsQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          plannedQty: '200',
          deliveredQty: '100',
          usedQty: '70',
          returnedQty: '30',
          usedCost: '175',
          plannedCost: '500',
        }),
      };

      materialsRepository.createQueryBuilder
        .mockReturnValueOnce(byStatusQb)
        .mockReturnValueOnce(totalsQb);

      const result = await service.getStats('project-1', 'tenant-1');

      expect(result.total).toBe(2);
      expect(result.byStatus).toHaveLength(2);
      expect(result.quantities).toEqual({
        planned: 200,
        delivered: 100,
        used: 70,
        returned: 30,
      });
      expect(result.costs).toEqual({ planned: 500, used: 175 });
    });

    it('should return zeros when no data', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      materialsRepository.find.mockResolvedValue([]);

      const emptyQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue(null),
      };
      materialsRepository.createQueryBuilder.mockReturnValue(emptyQb);

      const result = await service.getStats('project-1', 'tenant-1');

      expect(result.total).toBe(0);
      expect(result.quantities.planned).toBe(0);
      expect(result.costs.planned).toBe(0);
    });
  });
});