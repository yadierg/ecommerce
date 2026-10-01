// apps/budget-api/src/modules/invoices/invoices.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { InvoicesService } from './invoices.service';
import {
  Invoice,
  InvoiceStatus,
  InvoicePaymentMethod,
  Project,
  ProjectStatus,
  Budget,
} from '@ecommerce/core';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

// ============================================
// MOCKS
// ============================================
const mockInvoicesRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockProjectsRepository = {
  findOne: jest.fn(),
};

const mockBudgetsRepository = {
  findOne: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('InvoicesService', () => {
  let service: InvoicesService;
  let invoicesRepository: typeof mockInvoicesRepository;
  let projectsRepository: typeof mockProjectsRepository;
  let budgetsRepository: typeof mockBudgetsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getRepositoryToken(Invoice), useValue: mockInvoicesRepository },
        { provide: getRepositoryToken(Project), useValue: mockProjectsRepository },
        { provide: getRepositoryToken(Budget), useValue: mockBudgetsRepository },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    invoicesRepository = module.get(getRepositoryToken(Invoice));
    projectsRepository = module.get(getRepositoryToken(Project));
    budgetsRepository = module.get(getRepositoryToken(Budget));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto: CreateInvoiceDto = {
      projectId: 'project-1',
      tax: 0,
      discount: 0,
      paymentTerms: 30,
    };

    const mockProject = {
      id: 'project-1',
      tenantId: 'tenant-1',
      clientId: 'client-1',
      budgetId: 'budget-1',
      status: ProjectStatus.COMPLETED,
      materialsCostActual: '12000.00',
      laborCostActual: '200.00',
      additionalCostsActual: '500.00',
    };

    const mockBudget = {
      id: 'budget-1',
      total: '22060.00',
      tenantId: 'tenant-1',
    };

    /**
     * Configura mocks para un create exitoso.
     * El servicio llama findOne 2 veces:
     *   1) validar duplicado
     *   2) findOne(saved.id) al final del create
     */
    const setupSuccessfulCreate = () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      budgetsRepository.findOne.mockResolvedValue(mockBudget);
      invoicesRepository.count.mockResolvedValue(0);
      invoicesRepository.create.mockImplementation((data) => data);
      invoicesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'invoice-1' }),
      );
      // 1ª findOne → null (no duplicado)
      // 2ª findOne → factura guardada (retorno de findOne())
      invoicesRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'invoice-1',
          invoiceNumber: 'INV-202609-00001',
          materialsCost: 12000,
          laborCost: 200,
          additionalCosts: 500,
          subtotal: 12700,
          total: 12700,
        });
    };

    it('should create invoice with correct totals', async () => {
      setupSuccessfulCreate();

      await service.create(validDto, 'tenant-1', 'user-1');

      expect(invoicesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          materialsCost: 12000,
          laborCost: 200,
          additionalCosts: 500,
          subtotal: 12700,
          total: 12700,
        }),
      );
    });

    it('should calculate variance vs budget', async () => {
      setupSuccessfulCreate();

      await service.create(validDto, 'tenant-1');

      // Total: 12,700 | Budget: 22,060 | Variance: -9,360 | -42.43%
      expect(invoicesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          budgetTotal: 22060,
          variance: -9360,
          variancePercentage: expect.closeTo(-42.43, 0.1),
        }),
      );
    });

    it('should apply tax and discount', async () => {
      setupSuccessfulCreate();

      await service.create(
        { ...validDto, tax: 1000, discount: 500 },
        'tenant-1',
      );

      expect(invoicesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tax: 1000,
          discount: 500,
          total: 13200,
        }),
      );
    });

    it('should generate unique invoice number', async () => {
      setupSuccessfulCreate();
      invoicesRepository.count.mockResolvedValue(5);

      await service.create(validDto, 'tenant-1');

      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      expect(invoicesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceNumber: `INV-${year}${month}-00006`,
        }),
      );
    });

    it('should set initial status to DRAFT', async () => {
      setupSuccessfulCreate();

      await service.create(validDto, 'tenant-1');

      expect(invoicesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvoiceStatus.DRAFT }),
      );
    });

    it('should calculate dueDate from paymentTerms', async () => {
      setupSuccessfulCreate();

      await service.create(validDto, 'tenant-1');

      const createCall = invoicesRepository.create.mock.calls[0][0];
      const issueDate = new Date(createCall.issueDate);
      const dueDate = new Date(createCall.dueDate);
      const diffDays = Math.round(
        (dueDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(diffDays).toBe(30);
    });

    it('should use custom dueDate when provided', async () => {
      setupSuccessfulCreate();

      const customDue = '2026-12-31';
      await service.create({ ...validDto, dueDate: customDue }, 'tenant-1');

      const createCall = invoicesRepository.create.mock.calls[0][0];
      expect(new Date(createCall.dueDate).toISOString().slice(0, 10)).toBe(
        customDue,
      );
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

    it('should throw BadRequestException if project not completed', async () => {
      projectsRepository.findOne.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.IN_PROGRESS,
      });

      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        'Solo se pueden facturar proyectos completados',
      );
    });

    it('should throw BadRequestException if invoice already exists', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      invoicesRepository.findOne.mockResolvedValue({
        id: 'existing-invoice',
        invoiceNumber: 'INV-202609-00001',
      });

      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        'El proyecto ya tiene una factura',
      );
    });

    it('should handle project without budget', async () => {
      projectsRepository.findOne.mockResolvedValue({
        ...mockProject,
        budgetId: null,
      });
      invoicesRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'invoice-1' });
      invoicesRepository.count.mockResolvedValue(0);
      invoicesRepository.create.mockImplementation((data) => data);
      invoicesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'invoice-1' }),
      );

      await service.create(validDto, 'tenant-1');

      expect(invoicesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          budgetTotal: 0,
          variance: 12700,
          variancePercentage: 0,
        }),
      );
      expect(budgetsRepository.findOne).not.toHaveBeenCalled();
    });

    it('should handle project with budgetId but budget not found', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      budgetsRepository.findOne.mockResolvedValue(null);
      invoicesRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'invoice-1' });
      invoicesRepository.count.mockResolvedValue(0);
      invoicesRepository.create.mockImplementation((data) => data);
      invoicesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'invoice-1' }),
      );

      await service.create(validDto, 'tenant-1');

      expect(invoicesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          budgetTotal: 0,
          budgetId: undefined,
          variance: 12700,
          variancePercentage: 0,
        }),
      );
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    const buildQb = () => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    });

    it('should filter by tenantId', async () => {
      const qb = buildQb();
      invoicesRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.where).toHaveBeenCalledWith('invoice.tenantId = :tenantId', {
        tenantId: 'tenant-1',
      });
    });

    it('should apply pagination', async () => {
      const qb = buildQb();
      invoicesRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 3, limit: 5 }, 'tenant-1');

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should filter by status', async () => {
      const qb = buildQb();
      invoicesRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ status: InvoiceStatus.PAID }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith('invoice.status = :status', {
        status: InvoiceStatus.PAID,
      });
    });

    it('should filter by projectId and clientId', async () => {
      const qb = buildQb();
      invoicesRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { projectId: 'proj-1', clientId: 'cli-1' },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'invoice.projectId = :projectId',
        { projectId: 'proj-1' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'invoice.clientId = :clientId',
        { clientId: 'cli-1' },
      );
    });

    it('should apply search filter', async () => {
      const qb = buildQb();
      invoicesRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'INV-2026' }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%INV-2026%' },
      );
    });

    it('should apply date range filter', async () => {
      const qb = buildQb();
      invoicesRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { from: '2026-01-01', to: '2026-12-31' },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'invoice.issueDate BETWEEN :from AND :to',
        { from: '2026-01-01', to: '2026-12-31' },
      );
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return invoice by id with relations', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        invoiceNumber: 'INV-202609-00001',
        status: InvoiceStatus.DRAFT,
      };
      invoicesRepository.findOne.mockResolvedValue(mockInvoice);

      const result = await service.findOne('invoice-1', 'tenant-1');

      expect(result).toEqual(mockInvoice);
      expect(invoicesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'invoice-1', tenantId: 'tenant-1' },
        relations: ['client', 'project', 'budget', 'createdBy'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      invoicesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('invoice-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findOne('invoice-1', 'tenant-1'),
      ).rejects.toThrow('Factura invoice-1 no encontrada');
    });
  });

  // ============================================
  // FIND BY NUMBER
  // ============================================
  describe('findByNumber', () => {
    it('should return invoice by number', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        invoiceNumber: 'INV-202609-00001',
      };
      invoicesRepository.findOne.mockResolvedValue(mockInvoice);

      const result = await service.findByNumber(
        'INV-202609-00001',
        'tenant-1',
      );

      expect(result).toEqual(mockInvoice);
      expect(invoicesRepository.findOne).toHaveBeenCalledWith({
        where: { invoiceNumber: 'INV-202609-00001', tenantId: 'tenant-1' },
        relations: ['client', 'project', 'budget'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      invoicesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByNumber('INV-999999', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    const baseInvoice = () => ({
      id: 'invoice-1',
      status: InvoiceStatus.DRAFT,
      materialsCost: 12000,
      laborCost: 200,
      additionalCosts: 500,
      tax: 0,
      discount: 0,
      subtotal: 12700,
      total: 12700,
      budgetTotal: 22060,
      variance: -9360,
      variancePercentage: -42.43,
      notes: null,
    });

    it('should update invoice notes', async () => {
      const mockInvoice = baseInvoice();
      invoicesRepository.findOne.mockResolvedValue(mockInvoice);
      invoicesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update(
        'invoice-1',
        { notes: 'Updated notes' },
        'tenant-1',
      );

      expect(result.notes).toBe('Updated notes');
    });

    it('should recalculate totals when tax changes', async () => {
      const mockInvoice = baseInvoice();
      invoicesRepository.findOne.mockResolvedValue(mockInvoice);
      invoicesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('invoice-1', { tax: 1000 }, 'tenant-1');

      expect(invoicesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tax: 1000,
          subtotal: 12700,
          total: 13700,
          variance: -8360,
        }),
      );
    });

    it('should recalculate when additionalCosts changes', async () => {
      const mockInvoice = baseInvoice();
      invoicesRepository.findOne.mockResolvedValue(mockInvoice);
      invoicesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('invoice-1', { additionalCosts: 1000 }, 'tenant-1');

      // subtotal = 12000 + 200 + 1000 = 13200
      // total = 13200 + 0 - 0 = 13200
      // variance = 13200 - 22060 = -8860
      expect(invoicesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalCosts: 1000,
          subtotal: 13200,
          total: 13200,
          variance: -8860,
        }),
      );
    });

    it('should throw BadRequestException if not draft', async () => {
      invoicesRepository.findOne.mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.PAID,
      });

      await expect(
        service.update('invoice-1', { notes: 'test' }, 'tenant-1'),
      ).rejects.toThrow('Solo se pueden editar facturas en borrador');
    });
  });

  // ============================================
  // SEND
  // ============================================
  describe('send', () => {
    it('should change status from draft to sent', async () => {
      const mockInvoice = { id: 'invoice-1', status: InvoiceStatus.DRAFT };
      invoicesRepository.findOne.mockResolvedValue(mockInvoice);
      invoicesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.send('invoice-1', 'tenant-1');

      expect(result.status).toBe(InvoiceStatus.SENT);
      expect(result.sentAt).toBeDefined();
    });

    it('should throw BadRequestException if not draft', async () => {
      invoicesRepository.findOne.mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.PAID,
      });

      await expect(service.send('invoice-1', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================
  // MARK AS PAID
  // ============================================
  describe('markAsPaid', () => {
    it('should change status from sent to paid', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        status: InvoiceStatus.SENT,
        notes: null,
      };
      invoicesRepository.findOne.mockResolvedValue(mockInvoice);
      invoicesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.markAsPaid(
        'invoice-1',
        { paymentMethod: InvoicePaymentMethod.TRANSFER, paymentReference: 'TRF-001' },
        'tenant-1',
    );
      expect(result.status).toBe(InvoiceStatus.PAID);
      expect(result.paidAt).toBeDefined();
      expect(result.paymentMethod).toBe('transfer');
      expect(result.paymentReference).toBe('TRF-001');
    });

    it('should append payment note to existing notes', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        status: InvoiceStatus.SENT,
        notes: 'Nota previa',
      };
      invoicesRepository.findOne.mockResolvedValue(mockInvoice);
      invoicesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.markAsPaid(
        'invoice-1',
        { notes: 'Pagado por transferencia' },
        'tenant-1',
      );

      expect(result.notes).toContain('Nota previa');
      expect(result.notes).toContain('[Pago]: Pagado por transferencia');
    });

    it('should allow paying overdue invoices', async () => {
      const mockInvoice = { id: 'invoice-1', status: InvoiceStatus.OVERDUE };
      invoicesRepository.findOne.mockResolvedValue(mockInvoice);
      invoicesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.markAsPaid('invoice-1', {}, 'tenant-1');

      expect(result.status).toBe(InvoiceStatus.PAID);
    });

    it('should throw BadRequestException if already paid', async () => {
      invoicesRepository.findOne.mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.PAID,
      });

      await expect(
        service.markAsPaid('invoice-1', {}, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if draft (not yet sent)', async () => {
      invoicesRepository.findOne.mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.DRAFT,
      });

      await expect(
        service.markAsPaid('invoice-1', {}, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if cancelled', async () => {
      invoicesRepository.findOne.mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.CANCELLED,
      });

      await expect(
        service.markAsPaid('invoice-1', {}, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // CANCEL
  // ============================================
  describe('cancel', () => {
    it('should cancel a draft invoice', async () => {
      const mockInvoice = { id: 'invoice-1', status: InvoiceStatus.DRAFT };
      invoicesRepository.findOne.mockResolvedValue(mockInvoice);
      invoicesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.cancel('invoice-1', 'tenant-1');

      expect(result.status).toBe(InvoiceStatus.CANCELLED);
      expect(result.cancelledAt).toBeDefined();
    });

    it('should cancel a sent invoice', async () => {
      const mockInvoice = { id: 'invoice-1', status: InvoiceStatus.SENT };
      invoicesRepository.findOne.mockResolvedValue(mockInvoice);
      invoicesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.cancel('invoice-1', 'tenant-1');

      expect(result.status).toBe(InvoiceStatus.CANCELLED);
    });

    it('should throw BadRequestException if already paid', async () => {
      invoicesRepository.findOne.mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.PAID,
      });

      await expect(service.cancel('invoice-1', 'tenant-1')).rejects.toThrow(
        'No se puede cancelar una factura ya pagada',
      );
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove draft invoice', async () => {
      const mockInvoice = { id: 'invoice-1', status: InvoiceStatus.DRAFT };
      invoicesRepository.findOne.mockResolvedValue(mockInvoice);
      invoicesRepository.remove.mockResolvedValue(mockInvoice);

      const result = await service.remove('invoice-1', 'tenant-1');

      expect(result).toEqual({ message: 'Factura eliminada' });
      expect(invoicesRepository.remove).toHaveBeenCalledWith(mockInvoice);
    });

    it('should throw BadRequestException if not draft', async () => {
      invoicesRepository.findOne.mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.PAID,
      });

      await expect(service.remove('invoice-1', 'tenant-1')).rejects.toThrow(
        'Solo se pueden eliminar facturas en borrador',
      );
    });
  });

  // ============================================
  // CHECK OVERDUE
  // ============================================
  describe('checkOverdueInvoices', () => {
    const buildUpdateQb = (affected: number) => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected }),
    });

    it('should mark overdue invoices and return count', async () => {
      const qb = buildUpdateQb(3);
      invoicesRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.checkOverdueInvoices('tenant-1');

      expect(result).toBe(3);
      expect(qb.set).toHaveBeenCalledWith({ status: InvoiceStatus.OVERDUE });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'invoice.tenantId = :tenantId',
        { tenantId: 'tenant-1' },
      );
    });

    it('should return 0 if no overdue invoices', async () => {
      const qb = buildUpdateQb(0);
      invoicesRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.checkOverdueInvoices();

      expect(result).toBe(0);
      // Sin tenantId, no debe filtrar por tenant
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        'invoice.tenantId = :tenantId',
        expect.anything(),
      );
    });

    it('should handle null affected response', async () => {
      const qb = buildUpdateQb(undefined as any);
      qb.execute.mockResolvedValue({});
      invoicesRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.checkOverdueInvoices('tenant-1');

      expect(result).toBe(0);
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return invoice statistics', async () => {
      invoicesRepository.count.mockResolvedValue(10);

      const byStatusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'paid', count: '5', total: '60000' },
          { status: 'sent', count: '3', total: '40000' },
        ]),
      };
      const totalsQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest
          .fn()
          .mockResolvedValue({ totalAll: '100000', avgTotal: '10000' }),
      };
      const paidQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '60000' }),
      };
      const pendingQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '40000' }),
      };
      const variancesQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totalVariance: '-5000' }),
      };
      const expiringQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      };
      const overdueQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };

      invoicesRepository.createQueryBuilder
        .mockReturnValueOnce(byStatusQb)
        .mockReturnValueOnce(totalsQb)
        .mockReturnValueOnce(paidQb)
        .mockReturnValueOnce(pendingQb)
        .mockReturnValueOnce(variancesQb)
        .mockReturnValueOnce(expiringQb)
        .mockReturnValueOnce(overdueQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(10);
      expect(result.totalValue).toBe(100000);
      expect(result.avgValue).toBe(10000);
      expect(result.paidValue).toBe(60000);
      expect(result.pendingValue).toBe(40000);
      expect(result.totalVariance).toBe(-5000);
      expect(result.expiringSoon).toBe(2);
      expect(result.overdueCount).toBe(1);
      expect(result.byStatus).toHaveLength(2);
    });

    it('should return 0 values when no data', async () => {
      invoicesRepository.count.mockResolvedValue(0);

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

      invoicesRepository.createQueryBuilder.mockReturnValue(emptyQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(0);
      expect(result.totalValue).toBe(0);
      expect(result.paidValue).toBe(0);
      expect(result.pendingValue).toBe(0);
      expect(result.totalVariance).toBe(0);
      expect(result.expiringSoon).toBe(0);
      expect(result.overdueCount).toBe(0);
    });
  });
});