// apps/budget-api/src/modules/claims/claims.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { ClaimsService } from './claims.service';
import {
  Warranty,
  WarrantyStatus,
  WarrantyClaim,
  ClaimStatus,
  ClaimPriority,
  Worker,
} from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockClaimsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockWarrantiesRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockWorkersRepository = {
  findOne: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('ClaimsService', () => {
  let service: ClaimsService;
  let claimsRepository: typeof mockClaimsRepository;
  let warrantiesRepository: typeof mockWarrantiesRepository;
  let workersRepository: typeof mockWorkersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaimsService,
        {
          provide: getRepositoryToken(WarrantyClaim),
          useValue: mockClaimsRepository,
        },
        {
          provide: getRepositoryToken(Warranty),
          useValue: mockWarrantiesRepository,
        },
        {
          provide: getRepositoryToken(Worker),
          useValue: mockWorkersRepository,
        },
      ],
    }).compile();

    service = module.get<ClaimsService>(ClaimsService);
    claimsRepository = module.get(getRepositoryToken(WarrantyClaim));
    warrantiesRepository = module.get(getRepositoryToken(Warranty));
    workersRepository = module.get(getRepositoryToken(Worker));
  });

  afterEach(() => {
    jest.clearAllMocks();

    Object.values(mockClaimsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
    Object.values(mockWarrantiesRepository).forEach((mock: any) => {
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
  const mockWarranty = (overrides: Partial<Warranty> = {}): Warranty =>
    ({
      id: 'warranty-1',
      tenantId: 'tenant-1',
      warrantyNumber: 'WAR-202609-00001',
      status: WarrantyStatus.ACTIVE,
      endDate: new Date('2027-09-01'), // futuro
      claimsCount: 0,
      claimsCost: 0,
      claims: [],
      ...overrides,
    }) as Warranty;

  const mockClaim = (overrides: Partial<WarrantyClaim> = {}): WarrantyClaim =>
    ({
      id: 'claim-1',
      tenantId: 'tenant-1',
      warrantyId: 'warranty-1',
      assignedToId: null,
      createdById: null,
      resolvedById: null,
      claimNumber: 'WCL-202609-00001',
      status: ClaimStatus.OPEN,
      priority: ClaimPriority.NORMAL,
      issueDate: new Date('2026-09-15'),
      reviewedAt: null,
      resolvedAt: null,
      description: 'Panel no funciona',
      affectedItems: [],
      customerNotes: null,
      notes: null,
      rejectionReason: null,
      resolution: null,
      coveredCost: 0,
      customerCost: 0,
      ...overrides,
    }) as WarrantyClaim;

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
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto = {
      issueDate: '2026-09-15',
      description: 'Panel no funciona',
    };

    /**
     * setupCreateSuccess: el servicio hace 3 llamadas a warrantiesRepository.findOne:
     *  1) verifyWarranty al inicio
     *  2) updateWarrantyStats (con relations claims)
     *  3) findOne final (que re-verifica warranty)
     * Por eso usamos mockResolvedValue sticky.
     */
    const setupCreateSuccess = () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.count.mockResolvedValue(0);
      claimsRepository.create.mockImplementation((data) => data);
      claimsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'claim-1' }),
      );
      claimsRepository.findOne.mockResolvedValue(mockClaim());
    };

    it('should create claim with generated number', async () => {
      setupCreateSuccess();

      const result = await service.create(
        'warranty-1',
        validDto,
        'tenant-1',
        'user-1',
      );

      expect(claimsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          warrantyId: 'warranty-1',
          createdById: 'user-1',
          status: ClaimStatus.OPEN,
          priority: ClaimPriority.NORMAL,
          description: 'Panel no funciona',
        }),
      );
      expect(result.id).toBe('claim-1');
    });

    it('should generate claim number with format WCL-YYYYMM-NNNNN', async () => {
      setupCreateSuccess();
      claimsRepository.count.mockResolvedValue(5);

      await service.create('warranty-1', validDto, 'tenant-1');

      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      expect(claimsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          claimNumber: `WCL-${year}${month}-00006`,
        }),
      );
    });

    it('should use custom priority from dto', async () => {
      setupCreateSuccess();

      await service.create(
        'warranty-1',
        { ...validDto, priority: ClaimPriority.URGENT },
        'tenant-1',
      );

      expect(claimsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: ClaimPriority.URGENT }),
      );
    });

    it('should validate assigned worker if provided', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      workersRepository.findOne.mockResolvedValue({ id: 'worker-1' });
      claimsRepository.count.mockResolvedValue(0);
      claimsRepository.create.mockImplementation((data) => data);
      claimsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'claim-1' }),
      );
      claimsRepository.findOne.mockResolvedValue(mockClaim());

      await service.create(
        'warranty-1',
        { ...validDto, assignedToId: 'worker-1' },
        'tenant-1',
      );

      expect(workersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'worker-1', tenantId: 'tenant-1' },
      });
    });

    it('should throw BadRequestException if assigned worker not found', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      workersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          'warranty-1',
          { ...validDto, assignedToId: 'worker-1' },
          'tenant-1',
        ),
      ).rejects.toThrow('Worker no encontrado');
    });

    it('should throw NotFoundException if warranty not found', async () => {
      warrantiesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('warranty-1', validDto, 'tenant-1'),
      ).rejects.toThrow('Garantía warranty-1 no encontrada');
    });

    it('should throw BadRequestException if warranty not active', async () => {
      warrantiesRepository.findOne.mockResolvedValue(
        mockWarranty({ status: WarrantyStatus.EXPIRED }),
      );

      await expect(
        service.create('warranty-1', validDto, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if warranty expired by date', async () => {
      warrantiesRepository.findOne.mockResolvedValue(
        mockWarranty({ endDate: new Date('2020-01-01') }),
      );

      await expect(
        service.create('warranty-1', validDto, 'tenant-1'),
      ).rejects.toThrow('La garantía ya expiró');
    });

    it('should convert affectedItems from dto', async () => {
      setupCreateSuccess();

      await service.create(
        'warranty-1',
        {
          ...validDto,
          affectedItems: [
            {
              productId: 'prod-1',
              productName: 'Panel 400W',
              quantity: 2,
              issue: 'Vidrio roto',
            },
          ],
        },
        'tenant-1',
      );

      const createCall = claimsRepository.create.mock.calls[0][0];
      expect(createCall.affectedItems).toHaveLength(1);
      expect(createCall.affectedItems[0]).toMatchObject({
        productName: 'Panel 400W',
        quantity: 2,
        issue: 'Vidrio roto',
      });
    });

    it('should call updateWarrantyStats after create', async () => {
      setupCreateSuccess();

      await service.create('warranty-1', validDto, 'tenant-1');

      // warrantiesRepository.findOne se llama ≥2 veces (verify + updateStats + findOne final)
      expect(warrantiesRepository.findOne.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(warrantiesRepository.save).toHaveBeenCalled();
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should verify warranty and filter by warrantyId', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      const qb = buildQueryBuilder([]);
      claimsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('warranty-1', {}, 'tenant-1');

      expect(qb.where).toHaveBeenCalledWith(
        'claim.warrantyId = :warrantyId',
        { warrantyId: 'warranty-1' },
      );
    });

    it('should apply pagination', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      const qb = buildQueryBuilder([]);
      claimsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('warranty-1', { page: 3, limit: 5 }, 'tenant-1');

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should filter by status, priority, assignedToId', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      const qb = buildQueryBuilder([]);
      claimsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        'warranty-1',
        {
          status: ClaimStatus.OPEN,
          priority: ClaimPriority.HIGH,
          assignedToId: 'worker-1',
        },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith('claim.status = :status', {
        status: ClaimStatus.OPEN,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('claim.priority = :priority', {
        priority: ClaimPriority.HIGH,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'claim.assignedToId = :assignedToId',
        { assignedToId: 'worker-1' },
      );
    });

    it('should apply date range', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      const qb = buildQueryBuilder([]);
      claimsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        'warranty-1',
        { from: '2026-01-01', to: '2026-12-31' },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'claim.issueDate BETWEEN :from AND :to',
        { from: '2026-01-01', to: '2026-12-31' },
      );
    });

    it('should order by createdAt DESC', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      const qb = buildQueryBuilder([]);
      claimsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('warranty-1', {}, 'tenant-1');

      expect(qb.orderBy).toHaveBeenCalledWith('claim.createdAt', 'DESC');
    });

    it('should throw NotFoundException if warranty not found', async () => {
      warrantiesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findAll('warranty-1', {}, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return claim with relations', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      const claim = mockClaim();
      claimsRepository.findOne.mockResolvedValue(claim);

      const result = await service.findOne('claim-1', 'warranty-1', 'tenant-1');

      expect(result).toEqual(claim);
      expect(claimsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'claim-1', warrantyId: 'warranty-1' },
        relations: ['assignedTo', 'createdBy', 'resolvedBy', 'warranty'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('claim-1', 'warranty-1', 'tenant-1'),
      ).rejects.toThrow('Reclamo claim-1 no encontrado');
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should update claim fields', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.findOne.mockResolvedValue(mockClaim());
      claimsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update(
        'claim-1',
        { description: 'Nueva descripción' },
        'warranty-1',
        'tenant-1',
      );

      expect(result.description).toBe('Nueva descripción');
    });

    it('should validate assigned worker if changed', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.findOne.mockResolvedValue(mockClaim());
      workersRepository.findOne.mockResolvedValue({ id: 'worker-2' });
      claimsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update(
        'claim-1',
        { assignedToId: 'worker-2' },
        'warranty-1',
        'tenant-1',
      );

      expect(workersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'worker-2', tenantId: 'tenant-1' },
      });
    });

    it('should throw BadRequestException if RESOLVED', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.findOne.mockResolvedValue(
        mockClaim({ status: ClaimStatus.RESOLVED }),
      );

      await expect(
        service.update('claim-1', { description: 'x' }, 'warranty-1', 'tenant-1'),
      ).rejects.toThrow('No se puede editar un reclamo en estado resolved');
    });

    it('should throw BadRequestException if CANCELLED', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.findOne.mockResolvedValue(
        mockClaim({ status: ClaimStatus.CANCELLED }),
      );

      await expect(
        service.update('claim-1', { description: 'x' }, 'warranty-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // START REVIEW
  // ============================================
  describe('startReview', () => {
    it('should transition OPEN → IN_REVIEW', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      const claim = mockClaim({ status: ClaimStatus.OPEN });
      claimsRepository.findOne.mockResolvedValue(claim);
      claimsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.startReview(
        'claim-1',
        'warranty-1',
        'tenant-1',
      );

      expect(result.status).toBe(ClaimStatus.IN_REVIEW);
      expect(result.reviewedAt).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException if not OPEN', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.findOne.mockResolvedValue(
        mockClaim({ status: ClaimStatus.IN_REVIEW }),
      );

      await expect(
        service.startReview('claim-1', 'warranty-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // APPROVE
  // ============================================
  describe('approve', () => {
    it('should transition IN_REVIEW → APPROVED', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      const claim = mockClaim({ status: ClaimStatus.IN_REVIEW });
      claimsRepository.findOne.mockResolvedValue(claim);
      claimsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.approve('claim-1', 'warranty-1', 'tenant-1');

      expect(result.status).toBe(ClaimStatus.APPROVED);
    });

    it('should throw BadRequestException if not IN_REVIEW', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.findOne.mockResolvedValue(
        mockClaim({ status: ClaimStatus.OPEN }),
      );

      await expect(
        service.approve('claim-1', 'warranty-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // REJECT
  // ============================================
  describe('reject', () => {
    it('should reject claim and set reason', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      const claim = mockClaim({ status: ClaimStatus.OPEN });
      claimsRepository.findOne.mockResolvedValue(claim);
      claimsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.reject(
        'claim-1',
        'Uso indebido',
        'warranty-1',
        'tenant-1',
        'user-1',
      );

      expect(result.status).toBe(ClaimStatus.REJECTED);
      expect(result.rejectionReason).toBe('Uso indebido');
      expect(result.resolvedById).toBe('user-1');
      expect(result.resolvedAt).toBeInstanceOf(Date);
    });

    it('should allow rejecting IN_REVIEW and APPROVED', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.findOne.mockResolvedValue(
        mockClaim({ status: ClaimStatus.APPROVED }),
      );
      claimsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.reject('claim-1', 'motivo', 'warranty-1', 'tenant-1');

      expect(claimsRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if RESOLVED', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.findOne.mockResolvedValue(
        mockClaim({ status: ClaimStatus.RESOLVED }),
      );

      await expect(
        service.reject('claim-1', 'motivo', 'warranty-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already REJECTED', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.findOne.mockResolvedValue(
        mockClaim({ status: ClaimStatus.REJECTED }),
      );

      await expect(
        service.reject('claim-1', 'motivo', 'warranty-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call updateWarrantyStats', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.findOne.mockResolvedValue(mockClaim());
      claimsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.reject('claim-1', 'motivo', 'warranty-1', 'tenant-1');

      expect(warrantiesRepository.save).toHaveBeenCalled();
    });
  });

  // ============================================
  // RESOLVE
  // ============================================
  describe('resolve', () => {
    const validDto = {
      resolution: 'Se reemplazó el panel',
      coveredCost: 500,
      customerCost: 0,
    };

    it('should resolve IN_REVIEW claim', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      const claim = mockClaim({ status: ClaimStatus.IN_REVIEW });
      claimsRepository.findOne.mockResolvedValue(claim);
      claimsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.resolve(
        'claim-1',
        validDto,
        'warranty-1',
        'tenant-1',
        'user-1',
      );

      expect(result.status).toBe(ClaimStatus.RESOLVED);
      expect(result.resolution).toBe('Se reemplazó el panel');
      expect(result.coveredCost).toBe(500);
      expect(result.customerCost).toBe(0);
      expect(result.resolvedById).toBe('user-1');
      expect(result.resolvedAt).toBeInstanceOf(Date);
    });

    it('should resolve APPROVED claim', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.findOne.mockResolvedValue(
        mockClaim({ status: ClaimStatus.APPROVED }),
      );
      claimsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.resolve(
        'claim-1',
        validDto,
        'warranty-1',
        'tenant-1',
      );

      expect(result.status).toBe(ClaimStatus.RESOLVED);
    });

    it('should default coveredCost and customerCost to 0', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      const claim = mockClaim({ status: ClaimStatus.IN_REVIEW });
      claimsRepository.findOne.mockResolvedValue(claim);
      claimsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.resolve(
        'claim-1',
        { resolution: 'Fix' },
        'warranty-1',
        'tenant-1',
      );

      expect(claim.coveredCost).toBe(0);
      expect(claim.customerCost).toBe(0);
    });

    it('should append notes when provided', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      const claim = mockClaim({
        status: ClaimStatus.IN_REVIEW,
        notes: 'previo',
      });
      claimsRepository.findOne.mockResolvedValue(claim);
      claimsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.resolve(
        'claim-1',
        { ...validDto, notes: 'Nota final' },
        'warranty-1',
        'tenant-1',
      );

      expect(claim.notes).toContain('[Resolución]: Nota final');
      expect(claim.notes).toContain('previo');
    });

    it('should throw BadRequestException if OPEN', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.findOne.mockResolvedValue(
        mockClaim({ status: ClaimStatus.OPEN }),
      );

      await expect(
        service.resolve('claim-1', validDto, 'warranty-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // CANCEL
  // ============================================
  describe('cancel', () => {
    it('should cancel an open claim', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      const claim = mockClaim({ status: ClaimStatus.OPEN });
      claimsRepository.findOne.mockResolvedValue(claim);
      claimsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.cancel('claim-1', 'warranty-1', 'tenant-1');

      expect(result.status).toBe(ClaimStatus.CANCELLED);
    });

    it('should throw BadRequestException if RESOLVED', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.findOne.mockResolvedValue(
        mockClaim({ status: ClaimStatus.RESOLVED }),
      );

      await expect(
        service.cancel('claim-1', 'warranty-1', 'tenant-1'),
      ).rejects.toThrow('No se puede cancelar un reclamo ya resuelto');
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove an OPEN claim', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      const claim = mockClaim({ status: ClaimStatus.OPEN });
      claimsRepository.findOne.mockResolvedValue(claim);
      claimsRepository.remove.mockResolvedValue(claim);

      const result = await service.remove('claim-1', 'warranty-1', 'tenant-1');

      expect(result).toEqual({ message: 'Reclamo eliminado' });
      expect(claimsRepository.remove).toHaveBeenCalledWith(claim);
    });

    it('should throw BadRequestException if not OPEN', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.findOne.mockResolvedValue(
        mockClaim({ status: ClaimStatus.IN_REVIEW }),
      );

      await expect(
        service.remove('claim-1', 'warranty-1', 'tenant-1'),
      ).rejects.toThrow('Solo se pueden eliminar reclamos abiertos');
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return full statistics', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.count.mockResolvedValue(8);

      const byStatusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'open', count: '3' },
          { status: 'resolved', count: '5' },
        ]),
      };

      const byPriorityQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { priority: 'normal', count: '5' },
          { priority: 'urgent', count: '3' },
        ]),
      };

      const costsQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest
          .fn()
          .mockResolvedValue({ totalCovered: '1500.50', totalCustomer: '200' }),
      };

      claimsRepository.createQueryBuilder
        .mockReturnValueOnce(byStatusQb)
        .mockReturnValueOnce(byPriorityQb)
        .mockReturnValueOnce(costsQb);

      const result = await service.getStats('warranty-1', 'tenant-1');

      expect(result.total).toBe(8);
      expect(result.byStatus).toHaveLength(2);
      expect(result.byPriority).toHaveLength(2);
      expect(result.totalCovered).toBe(1500.5);
      expect(result.totalCustomer).toBe(200);
    });

    it('should return zeros when no claims', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.count.mockResolvedValue(0);

      const emptyQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue(null),
      };
      claimsRepository.createQueryBuilder.mockReturnValue(emptyQb);

      const result = await service.getStats('warranty-1', 'tenant-1');

      expect(result.total).toBe(0);
      expect(result.totalCovered).toBe(0);
      expect(result.totalCustomer).toBe(0);
    });

    it('should only sum RESOLVED claims in costs', async () => {
      warrantiesRepository.findOne.mockResolvedValue(mockWarranty());
      claimsRepository.count.mockResolvedValue(0);

      const byStatusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      const byPriorityQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      const costsQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      };

      claimsRepository.createQueryBuilder
        .mockReturnValueOnce(byStatusQb)
        .mockReturnValueOnce(byPriorityQb)
        .mockReturnValueOnce(costsQb);

      await service.getStats('warranty-1', 'tenant-1');

      expect(costsQb.andWhere).toHaveBeenCalledWith(
        'claim.status = :status',
        { status: ClaimStatus.RESOLVED },
      );
    });

    it('should throw NotFoundException if warranty not found', async () => {
      warrantiesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getStats('warranty-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});