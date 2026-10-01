// apps/budget-api/src/modules/warranties/warranties.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { WarrantiesService } from './warranties.service';
import {
  Warranty,
  WarrantyStatus,
  WarrantyCoveredItem,
  Project,
  ProjectMaterial,
  Invoice,
  Budget,
  Client,
} from '@ecommerce/core';
import { CreateWarrantyDto } from './dto/create-warranty.dto';

// ============================================
// MOCKS
// ============================================
const mockWarrantiesRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockProjectsRepository = { findOne: jest.fn() };
const mockMaterialsRepository = { find: jest.fn() };
const mockInvoicesRepository = { findOne: jest.fn() };
const mockBudgetsRepository = { findOne: jest.fn() };
const mockClientsRepository = { findOne: jest.fn() };

// ============================================
// TEST SUITE
// ============================================
describe('WarrantiesService', () => {
  let service: WarrantiesService;
  let warrantiesRepository: typeof mockWarrantiesRepository;
  let projectsRepository: typeof mockProjectsRepository;
  let materialsRepository: typeof mockMaterialsRepository;
  let invoicesRepository: typeof mockInvoicesRepository;
  let budgetsRepository: typeof mockBudgetsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarrantiesService,
        {
          provide: getRepositoryToken(Warranty),
          useValue: mockWarrantiesRepository,
        },
        { provide: getRepositoryToken(Project), useValue: mockProjectsRepository },
        {
          provide: getRepositoryToken(ProjectMaterial),
          useValue: mockMaterialsRepository,
        },
        { provide: getRepositoryToken(Invoice), useValue: mockInvoicesRepository },
        { provide: getRepositoryToken(Budget), useValue: mockBudgetsRepository },
        { provide: getRepositoryToken(Client), useValue: mockClientsRepository },
      ],
    }).compile();

    service = module.get<WarrantiesService>(WarrantiesService);
    warrantiesRepository = module.get(getRepositoryToken(Warranty));
    projectsRepository = module.get(getRepositoryToken(Project));
    materialsRepository = module.get(getRepositoryToken(ProjectMaterial));
    invoicesRepository = module.get(getRepositoryToken(Invoice));
    budgetsRepository = module.get(getRepositoryToken(Budget));
  });

  afterEach(() => {
    // ✅ FIX: clearAllMocks NO limpia colas de mockResolvedValueOnce.
    // Hay que hacer mockReset() individualmente o usar jest.resetAllMocks().
    jest.clearAllMocks();

    // Limpiar TODOS los mocks de warrantiesRepository (incluye colas Once)
    Object.values(mockWarrantiesRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });

    // Limpiar también los repos auxiliares
    Object.values(mockProjectsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockMaterialsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockInvoicesRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockBudgetsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
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
  const mockProject = {
    id: 'project-1',
    tenantId: 'tenant-1',
    clientId: 'client-1',
    projectNumber: 'PRJ-2026-001',
  };

  /**
   * Helper con tipado explícito para evitar errores TS
   * al acceder a propiedades opcionales como renewedToId.
   */
  const mockWarranty = (overrides: Partial<Warranty> = {}): Warranty =>
    ({
      id: 'war-1',
      tenantId: 'tenant-1',
      projectId: 'project-1',
      clientId: 'client-1',
      invoiceId: 'inv-1',
      warrantyNumber: 'WAR-202609-00001',
      status: WarrantyStatus.ACTIVE,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-09-01'),
      monthsDuration: 12,
      coveredItems: [] as WarrantyCoveredItem[],
      claimsCount: 0,
      claimsCost: 0,
      renewedFromId: undefined,
      renewedToId: undefined,
      notes: null,
      ...overrides,
    }) as Warranty;

  const buildQueryBuilder = (data: any[], total?: number) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([data, total ?? data.length]),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(null),
    getCount: jest.fn().mockResolvedValue(0),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  });

  // ============================================
  // CREATE (manual)
  // ============================================
  describe('create', () => {
    const validDto: CreateWarrantyDto = {
      projectId: 'project-1',
      monthsDuration: 24,
    };

    it('should create warranty with generated number', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      warrantiesRepository.count.mockResolvedValue(0);
      warrantiesRepository.create.mockImplementation((data) => data);
      warrantiesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'war-1' }),
      );
      // findOne: 1) validar duplicado, 2) return final
      warrantiesRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockWarranty());

      const result = await service.create(validDto, 'tenant-1', 'user-1');

      expect(warrantiesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          projectId: 'project-1',
          clientId: 'client-1',
          status: WarrantyStatus.ACTIVE,
          monthsDuration: 24,
          createdById: 'user-1',
        }),
      );
      expect(result.id).toBe('war-1');
    });

    it('should calculate endDate = startDate + monthsDuration', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      warrantiesRepository.count.mockResolvedValue(0);
      warrantiesRepository.create.mockImplementation((data) => data);
      warrantiesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'war-1' }),
      );
      warrantiesRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockWarranty());

      await service.create(
        { ...validDto, startDate: '2026-01-15', monthsDuration: 24 },
        'tenant-1',
      );

      const createCall = warrantiesRepository.create.mock.calls[0][0];
      expect(createCall.startDate.toISOString().slice(0, 10)).toBe('2026-01-15');
      expect(createCall.endDate.toISOString().slice(0, 10)).toBe('2028-01-15');
    });

    it('should generate warranty number with format WAR-YYYYMM-NNNNN', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      warrantiesRepository.count.mockResolvedValue(7);
      warrantiesRepository.create.mockImplementation((data) => data);
      warrantiesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'war-1' }),
      );
      warrantiesRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockWarranty());

      await service.create(validDto, 'tenant-1');

      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      expect(warrantiesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          warrantyNumber: `WAR-${year}${month}-00008`,
        }),
      );
    });

    it('should convert coveredItems dates to Date objects', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      warrantiesRepository.count.mockResolvedValue(0);
      warrantiesRepository.create.mockImplementation((data) => data);
      warrantiesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'war-1' }),
      );
      warrantiesRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockWarranty());

      const dtoWithItems: CreateWarrantyDto = {
        ...validDto,
        coveredItems: [
          {
            productId: 'prod-1',
            productName: 'Panel Solar 400W',
            quantity: 10,
            installedAt: '2026-09-01',
            warrantyMonths: 24,
            specificEndDate: '2028-09-01',
          },
        ],
      };

      await service.create(dtoWithItems, 'tenant-1');

      const createCall = warrantiesRepository.create.mock.calls[0][0];
      expect(createCall.coveredItems).toHaveLength(1);
      expect(createCall.coveredItems[0].installedAt).toBeInstanceOf(Date);
      expect(createCall.coveredItems[0].specificEndDate).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if project not found', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        'Proyecto project-1 no encontrado',
      );
    });

    it('should throw BadRequestException if active warranty already exists', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      warrantiesRepository.findOne.mockResolvedValue({
        id: 'war-existing',
        warrantyNumber: 'WAR-202609-00001',
      });

      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        'ya tiene una garantía activa',
      );
    });
  });

  // ============================================
  // CREATE FROM INVOICE (auto) ⭐
  // ============================================
  describe('createFromInvoice', () => {
    const mockInvoice = {
      id: 'inv-1',
      tenantId: 'tenant-1',
      invoiceNumber: 'INV-202609-00001',
      projectId: 'project-1',
      clientId: 'client-1',
      budgetId: 'budget-1',
      issueDate: new Date('2026-09-15'),
    };

    const mockMaterials = [
      {
        id: 'mat-1',
        projectId: 'project-1',
        productId: 'prod-1',
        productName: 'Panel Solar 400W',
        productSku: 'PNL-400',
        quantityUsed: 10,
        unitPrice: 200,
      },
      {
        id: 'mat-2',
        projectId: 'project-1',
        productId: 'prod-2',
        productName: 'Cable 6mm',
        productSku: 'CBL-6',
        quantityUsed: 50,
        unitPrice: 1.5,
      },
      {
        id: 'mat-3',
        projectId: 'project-1',
        productName: 'Material no usado',
        quantityUsed: 0, // ❌ debe filtrarse
      },
    ];

    const setupAutoCreate = (budgetMonths?: number) => {
      invoicesRepository.findOne.mockResolvedValue(mockInvoice);
      projectsRepository.findOne.mockResolvedValue(mockProject);
      materialsRepository.find.mockResolvedValue(mockMaterials);
      warrantiesRepository.findOne
        .mockResolvedValueOnce(null) // no existe warranty
        .mockResolvedValueOnce(mockWarranty()); // return final
      warrantiesRepository.count.mockResolvedValue(0);
      warrantiesRepository.create.mockImplementation((data) => data);
      warrantiesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'war-1' }),
      );

      if (budgetMonths !== undefined) {
        budgetsRepository.findOne.mockResolvedValue({
          id: 'budget-1',
          warrantyMonths: budgetMonths,
        });
      } else {
        budgetsRepository.findOne.mockResolvedValue(null);
      }
    };

    it('should auto-create warranty from invoice', async () => {
      setupAutoCreate(24);

      const result = await service.createFromInvoice(
        'inv-1',
        'tenant-1',
        'user-1',
      );

      expect(warrantiesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          projectId: 'project-1',
          clientId: 'client-1',
          invoiceId: 'inv-1',
          status: WarrantyStatus.ACTIVE,
          monthsDuration: 24,
          createdById: 'user-1',
        }),
      );
      expect(result.id).toBe('war-1');
    });

    it('should use default 12 months when budget has no warrantyMonths', async () => {
      setupAutoCreate(undefined);

      await service.createFromInvoice('inv-1', 'tenant-1');

      expect(warrantiesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ monthsDuration: 12 }),
      );
    });

    it('should only include materials with quantityUsed > 0', async () => {
      setupAutoCreate(24);

      await service.createFromInvoice('inv-1', 'tenant-1');

      const createCall = warrantiesRepository.create.mock.calls[0][0];
      expect(createCall.coveredItems).toHaveLength(2); // mat-1 y mat-2
      expect(createCall.coveredItems[0].productName).toBe('Panel Solar 400W');
      expect(createCall.coveredItems[1].productName).toBe('Cable 6mm');
    });

    it('should set coveredItems endDate = issueDate + warrantyMonths', async () => {
      setupAutoCreate(12);

      await service.createFromInvoice('inv-1', 'tenant-1');

      const createCall = warrantiesRepository.create.mock.calls[0][0];
      const item = createCall.coveredItems[0];

      // issueDate = 2026-09-15 + 12 meses = 2027-09-15
      expect(item.installedAt.toISOString().slice(0, 10)).toBe('2026-09-15');
      expect(item.specificEndDate.toISOString().slice(0, 10)).toBe('2027-09-15');
    });

    it('should return existing warranty if invoice already has one', async () => {
      invoicesRepository.findOne.mockResolvedValue(mockInvoice);
      warrantiesRepository.findOne
        .mockResolvedValueOnce({
          id: 'war-existing',
          warrantyNumber: 'WAR-202609-00001',
        })
        .mockResolvedValueOnce(mockWarranty({ id: 'war-existing' }));

      const result = await service.createFromInvoice('inv-1', 'tenant-1');

      expect(warrantiesRepository.save).not.toHaveBeenCalled();
      expect(result.id).toBe('war-existing');
    });

    it('should throw NotFoundException if invoice not found', async () => {
      invoicesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createFromInvoice('inv-1', 'tenant-1'),
      ).rejects.toThrow('Factura inv-1 no encontrada');
    });

    it('should throw NotFoundException if project not found', async () => {
      invoicesRepository.findOne.mockResolvedValue(mockInvoice);
      warrantiesRepository.findOne.mockResolvedValue(null);
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createFromInvoice('inv-1', 'tenant-1'),
      ).rejects.toThrow('Proyecto project-1 no encontrado');
    });

    it('should handle invoice with no budgetId (default months)', async () => {
      invoicesRepository.findOne.mockResolvedValue({
        ...mockInvoice,
        budgetId: null,
      });
      projectsRepository.findOne.mockResolvedValue(mockProject);
      materialsRepository.find.mockResolvedValue(mockMaterials);
      warrantiesRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockWarranty());
      warrantiesRepository.count.mockResolvedValue(0);
      warrantiesRepository.create.mockImplementation((data) => data);
      warrantiesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'war-1' }),
      );

      await service.createFromInvoice('inv-1', 'tenant-1');

      expect(budgetsRepository.findOne).not.toHaveBeenCalled();
      expect(warrantiesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ monthsDuration: 12 }),
      );
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should filter by tenantId', async () => {
      const qb = buildQueryBuilder([]);
      warrantiesRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.where).toHaveBeenCalledWith('warranty.tenantId = :tenantId', {
        tenantId: 'tenant-1',
      });
    });

    it('should apply pagination', async () => {
      const qb = buildQueryBuilder([]);
      warrantiesRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 2, limit: 10 }, 'tenant-1');

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('should filter by status', async () => {
      const qb = buildQueryBuilder([]);
      warrantiesRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ status: WarrantyStatus.EXPIRED }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith('warranty.status = :status', {
        status: WarrantyStatus.EXPIRED,
      });
    });

    it('should filter by projectId and clientId', async () => {
      const qb = buildQueryBuilder([]);
      warrantiesRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { projectId: 'proj-1', clientId: 'cli-1' },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'warranty.projectId = :projectId',
        { projectId: 'proj-1' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'warranty.clientId = :clientId',
        { clientId: 'cli-1' },
      );
    });

    it('should apply search', async () => {
      const qb = buildQueryBuilder([]);
      warrantiesRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'WAR' }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%WAR%' },
      );
    });

    it('should apply date range', async () => {
      const qb = buildQueryBuilder([]);
      warrantiesRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { from: '2026-01-01', to: '2026-12-31' },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'warranty.startDate BETWEEN :from AND :to',
        { from: '2026-01-01', to: '2026-12-31' },
      );
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return warranty with relations', async () => {
      const warranty = mockWarranty();
      warrantiesRepository.findOne.mockResolvedValue(warranty);

      const result = await service.findOne('war-1', 'tenant-1');

      expect(result).toEqual(warranty);
      expect(warrantiesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'war-1', tenantId: 'tenant-1' },
        relations: ['client', 'project', 'invoice', 'claims'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      warrantiesRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('war-1', 'tenant-1')).rejects.toThrow(
        'Garantía war-1 no encontrada',
      );
    });
  });

  // ============================================
  // FIND BY NUMBER
  // ============================================
  describe('findByNumber', () => {
    it('should return warranty by number', async () => {
      const warranty = mockWarranty();
      warrantiesRepository.findOne.mockResolvedValue(warranty);

      const result = await service.findByNumber('WAR-202609-00001', 'tenant-1');

      expect(result).toEqual(warranty);
      expect(warrantiesRepository.findOne).toHaveBeenCalledWith({
        where: { warrantyNumber: 'WAR-202609-00001', tenantId: 'tenant-1' },
        relations: ['client', 'project', 'invoice', 'claims'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      warrantiesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByNumber('WAR-999999', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should update active warranty', async () => {
      const warranty = mockWarranty();
      warrantiesRepository.findOne.mockResolvedValue(warranty);
      warrantiesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update(
        'war-1',
        { notes: 'Actualizado' },
        'tenant-1',
      );

      expect(result.notes).toBe('Actualizado');
    });

    it('should convert endDate string to Date', async () => {
      const warranty = mockWarranty();
      warrantiesRepository.findOne.mockResolvedValue(warranty);
      warrantiesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('war-1', { endDate: '2028-12-31' }, 'tenant-1');

      expect(warranty.endDate).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException if not active', async () => {
      warrantiesRepository.findOne.mockResolvedValue(
        mockWarranty({ status: WarrantyStatus.EXPIRED }),
      );

      await expect(
        service.update('war-1', { notes: 'x' }, 'tenant-1'),
      ).rejects.toThrow('Solo se pueden editar garantías activas');
    });
  });

  // ============================================
  // VOID
  // ============================================
  describe('void', () => {
    it('should void an active warranty', async () => {
      const warranty = mockWarranty();
      warrantiesRepository.findOne.mockResolvedValue(warranty);
      warrantiesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.void(
        'war-1',
        'Cliente no cumplió',
        'tenant-1',
      );

      expect(result.status).toBe(WarrantyStatus.VOIDED);
      expect(result.notes).toContain('[Anulada]: Cliente no cumplió');
    });

    it('should throw BadRequestException if not active', async () => {
      warrantiesRepository.findOne.mockResolvedValue(
        mockWarranty({ status: WarrantyStatus.VOIDED }),
      );

      await expect(
        service.void('war-1', 'motivo', 'tenant-1'),
      ).rejects.toThrow('Solo se pueden anular garantías activas');
    });
  });

  // ============================================
  // RENEW
  // ============================================
  describe('renew', () => {
    const coveredItem: WarrantyCoveredItem = {
      productId: 'prod-1',
      productName: 'Panel Solar 400W',
      quantity: 10,
      installedAt: new Date('2026-09-01'),
      warrantyMonths: 12,
      specificEndDate: new Date('2027-09-01'),
    };

    /**
     * IMPORTANTE: el servicio solo hace 2 llamadas a findOne:
     *   1) findOne(id) → obtener original
     *   2) findOne(saved.id) → return final (el renewal)
     * NO hay tercera llamada.
     */
    it('should renew active warranty', async () => {
      const original = mockWarranty({
        coveredItems: [coveredItem],
        warrantyNumber: 'WAR-202609-00001',
      });

      warrantiesRepository.findOne
        .mockResolvedValueOnce(original) // 1) findOne inicial
        .mockResolvedValueOnce({
          ...mockWarranty({ id: 'war-new' }),
          renewedFromId: 'war-1',
        }); // 2) findOne final (renewal)

      warrantiesRepository.count.mockResolvedValue(1);
      warrantiesRepository.create.mockImplementation((data) => data);
      warrantiesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.renew('war-1', 12, 'tenant-1', 'user-1');

      expect(original.status).toBe(WarrantyStatus.RENEWED);
      expect(warrantiesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          renewedFromId: 'war-1',
          monthsDuration: 12,
          status: WarrantyStatus.ACTIVE,
        }),
      );
      expect(result.renewedFromId).toBe('war-1');
    });

    it('should allow renewing expired warranty', async () => {
      const original = mockWarranty({
        status: WarrantyStatus.EXPIRED,
        coveredItems: [],
      });

      warrantiesRepository.findOne
        .mockResolvedValueOnce(original) // 1) findOne inicial
        .mockResolvedValueOnce(mockWarranty({ id: 'war-new' })); // 2) findOne final

      warrantiesRepository.count.mockResolvedValue(0);
      warrantiesRepository.create.mockImplementation((data) => data);
      warrantiesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.renew('war-1', 6, 'tenant-1');

      expect(original.status).toBe(WarrantyStatus.RENEWED);
    });

    it('should link bidirectional renewedFrom/renewedTo', async () => {
    const original = mockWarranty({ coveredItems: [] });

    warrantiesRepository.findOne
        .mockResolvedValueOnce(original)
        .mockResolvedValueOnce({
        ...mockWarranty({ id: 'war-new' }),
        renewedFromId: 'war-1',
        });

    warrantiesRepository.count.mockResolvedValue(0);
    warrantiesRepository.create.mockImplementation((data) => data);

    // ✅ save genera id auto para nuevos registros (simula TypeORM)
    warrantiesRepository.save.mockImplementation((data) => {
        if (!data.id) {
        return Promise.resolve({ ...data, id: 'war-new' });
        }
        return Promise.resolve(data);
    });

    await service.renew('war-1', 12, 'tenant-1');

    const originalSaves = warrantiesRepository.save.mock.calls.filter(
        (call) => call[0].id === 'war-1',
    );
    expect(originalSaves.length).toBe(2);
    expect(original.renewedToId).toBe('war-new');
    // Verifica también el otro lado del link
    expect(originalSaves[1][0]).toMatchObject({ renewedToId: 'war-new' });
    });

    it('should throw BadRequestException if status VOIDED', async () => {
      warrantiesRepository.findOne.mockResolvedValue(
        mockWarranty({ status: WarrantyStatus.VOIDED }),
      );

      await expect(service.renew('war-1', 12, 'tenant-1')).rejects.toThrow(
        'Solo se pueden renovar garantías activas o vencidas',
      );
    });
  });

  // ============================================
  // UPDATE CLAIM STATS
  // ============================================
  describe('updateClaimStats', () => {
    it('should update claimsCount and claimsCost', async () => {
      const warranty = mockWarranty({
        claims: [
          { status: 'resolved', coveredCost: 100 },
          { status: 'approved', coveredCost: 50 },
          { status: 'open', coveredCost: 0 },
        ],
      } as any);
      warrantiesRepository.findOne.mockResolvedValue(warranty);
      warrantiesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.updateClaimStats('war-1', 'tenant-1');

      expect(warranty.claimsCount).toBe(3);
      expect(warranty.claimsCost).toBe(150);
    });

    it('should set status CLAIMED if there are active claims', async () => {
      const warranty = mockWarranty({
        status: WarrantyStatus.ACTIVE,
        claims: [{ status: 'open', coveredCost: 0 }],
      } as any);
      warrantiesRepository.findOne.mockResolvedValue(warranty);
      warrantiesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.updateClaimStats('war-1', 'tenant-1');

      expect(warranty.status).toBe(WarrantyStatus.CLAIMED);
    });

    it('should not change status if no active claims', async () => {
      const warranty = mockWarranty({
        status: WarrantyStatus.ACTIVE,
        claims: [{ status: 'resolved', coveredCost: 100 }],
      } as any);
      warrantiesRepository.findOne.mockResolvedValue(warranty);
      warrantiesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.updateClaimStats('war-1', 'tenant-1');

      expect(warranty.status).toBe(WarrantyStatus.ACTIVE);
    });

    it('should silently return if warranty not found', async () => {
      warrantiesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateClaimStats('war-1', 'tenant-1'),
      ).resolves.toBeUndefined();
      expect(warrantiesRepository.save).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // CHECK EXPIRED (cronjob)
  // ============================================
  describe('checkExpiredWarranties', () => {
    const buildUpdateQb = (affected: number) => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected }),
    });

    it('should mark expired warranties and return count', async () => {
      const qb = buildUpdateQb(3);
      warrantiesRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.checkExpiredWarranties('tenant-1');

      expect(result).toBe(3);
      expect(qb.set).toHaveBeenCalledWith({ status: WarrantyStatus.EXPIRED });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'warranty.tenantId = :tenantId',
        { tenantId: 'tenant-1' },
      );
    });

    it('should process all tenants when tenantId not provided', async () => {
      const qb = buildUpdateQb(5);
      warrantiesRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.checkExpiredWarranties();

      expect(result).toBe(5);
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'warranty.tenantId = :tenantId',
        expect.anything(),
      );
    });

    it('should return 0 if no expired warranties', async () => {
      const qb = buildUpdateQb(0);
      warrantiesRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.checkExpiredWarranties('tenant-1');

      expect(result).toBe(0);
    });

    it('should handle null affected', async () => {
      const qb = buildUpdateQb(undefined as any);
      qb.execute.mockResolvedValue({});
      warrantiesRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.checkExpiredWarranties();

      expect(result).toBe(0);
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return full statistics', async () => {
      warrantiesRepository.count.mockResolvedValue(10);

      const byStatusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'active', count: '5' },
          { status: 'expired', count: '3' },
          { status: 'claimed', count: '2' },
        ]),
      };
      const claimsQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest
          .fn()
          .mockResolvedValue({ totalClaims: '8', totalClaimsCost: '1500.50' }),
      };
      const expiringQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      };

      warrantiesRepository.createQueryBuilder
        .mockReturnValueOnce(byStatusQb)
        .mockReturnValueOnce(claimsQb)
        .mockReturnValueOnce(expiringQb);

      warrantiesRepository.find.mockResolvedValue([
        { id: 'war-1', coveredItems: [{}, {}, {}] },
        { id: 'war-2', coveredItems: [{}, {}] },
      ]);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(10);
      expect(result.byStatus).toHaveLength(3);
      expect(result.totalClaims).toBe(8);
      expect(result.totalClaimsCost).toBe(1500.5);
      expect(result.expiringSoon).toBe(3);
      expect(result.totalCoveredItems).toBe(5);
    });

    it('should return zeros when no data', async () => {
      warrantiesRepository.count.mockResolvedValue(0);

      const emptyQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue(null),
        getCount: jest.fn().mockResolvedValue(0),
      };
      warrantiesRepository.createQueryBuilder.mockReturnValue(emptyQb);
      warrantiesRepository.find.mockResolvedValue([]);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(0);
      expect(result.totalClaims).toBe(0);
      expect(result.totalClaimsCost).toBe(0);
      expect(result.expiringSoon).toBe(0);
      expect(result.totalCoveredItems).toBe(0);
    });
  });

  // ============================================
  // BY CLIENT
  // ============================================
  describe('findByClient', () => {
    it('should return warranties for client ordered by createdAt DESC', async () => {
      const warranties = [mockWarranty()];
      warrantiesRepository.find.mockResolvedValue(warranties);

      const result = await service.findByClient('client-1', 'tenant-1');

      expect(result).toEqual(warranties);
      expect(warrantiesRepository.find).toHaveBeenCalledWith({
        where: { clientId: 'client-1', tenantId: 'tenant-1' },
        relations: ['project', 'claims'],
        order: { createdAt: 'DESC' },
      });
    });
  });
});