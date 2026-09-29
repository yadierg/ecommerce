// apps/budget-api/src/modules/claims/claims.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Warranty,
  WarrantyClaim,
  ClaimStatus,
  ClaimPriority,
  ClaimAffectedItem,
  Worker,
} from '@ecommerce/core';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { QueryClaimDto } from './dto/query-claim.dto';
import { ResolveClaimDto } from './dto/resolve-claim.dto';

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    @InjectRepository(WarrantyClaim)
    private readonly claimsRepository: Repository<WarrantyClaim>,
    @InjectRepository(Warranty)
    private readonly warrantiesRepository: Repository<Warranty>,
    @InjectRepository(Worker)
    private readonly workersRepository: Repository<Worker>,
  ) {}

  // ============================================
  // HELPER
  // ============================================
  private async verifyWarranty(warrantyId: string, tenantId: string) {
    const warranty = await this.warrantiesRepository.findOne({
      where: { id: warrantyId, tenantId },
    });

    if (!warranty) {
      throw new NotFoundException(`Garantía ${warrantyId} no encontrada`);
    }

    return warranty;
  }

  private async generateClaimNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const prefix = `WCL-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.claimsRepository.count({ where: { tenantId } });
    const sequence = String(count + 1).padStart(5, '0');

    return `${prefix}-${sequence}`;
  }

  // ============================================
  // CREATE
  // ============================================
  async create(
    warrantyId: string,
    dto: CreateClaimDto,
    tenantId: string,
    userId?: string,
  ): Promise<WarrantyClaim> {
    const warranty = await this.verifyWarranty(warrantyId, tenantId);

    // Validar que la garantía esté activa o en claims
    if (warranty.status !== 'active' && warranty.status !== 'claimed') {
      throw new BadRequestException(
        `Solo se pueden crear reclamos en garantías activas. Estado: ${warranty.status}`,
      );
    }

    // Validar que no esté vencida
    if (new Date() > new Date(warranty.endDate)) {
      throw new BadRequestException('La garantía ya expiró');
    }

    // Validar worker asignado (si se proporciona)
    if (dto.assignedToId) {
      const worker = await this.workersRepository.findOne({
        where: { id: dto.assignedToId, tenantId },
      });
      if (!worker) {
        throw new BadRequestException('Worker no encontrado');
      }
    }

    // Convertir affected items
    const affectedItems: ClaimAffectedItem[] = (dto.affectedItems || []).map(
      (item) => ({
        productId: item.productId,
        productName: item.productName,
        serialNumber: item.serialNumber,
        quantity: item.quantity,
        issue: item.issue,
      }),
    );

    const claimNumber = await this.generateClaimNumber(tenantId);

    const claim = this.claimsRepository.create({
      tenantId,
      warrantyId,
      assignedToId: dto.assignedToId,
      createdById: userId,
      claimNumber,
      status: ClaimStatus.OPEN,
      priority: dto.priority || ClaimPriority.NORMAL,
      issueDate: new Date(dto.issueDate),
      description: dto.description,
      affectedItems,
      customerNotes: dto.customerNotes,
      notes: dto.notes,
    });

    const saved = await this.claimsRepository.save(claim);

    // Actualizar stats de la garantía
    await this.updateWarrantyStats(warrantyId, tenantId);

    this.logger.log(`📝 Reclamo creado: ${saved.claimNumber}`);
    return this.findOne(saved.id, warrantyId, tenantId);
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(warrantyId: string, query: QueryClaimDto, tenantId: string) {
    await this.verifyWarranty(warrantyId, tenantId);

    const { page = 1, limit = 20, status, priority, assignedToId, from, to } = query;
    const skip = (page - 1) * limit;

    const qb = this.claimsRepository
      .createQueryBuilder('claim')
      .leftJoinAndSelect('claim.assignedTo', 'assignedTo')
      .leftJoinAndSelect('claim.resolvedBy', 'resolvedBy')
      .where('claim.warrantyId = :warrantyId', { warrantyId });

    if (status) qb.andWhere('claim.status = :status', { status });
    if (priority) qb.andWhere('claim.priority = :priority', { priority });
    if (assignedToId) qb.andWhere('claim.assignedToId = :assignedToId', { assignedToId });

    if (from && to) {
      qb.andWhere('claim.issueDate BETWEEN :from AND :to', { from, to });
    }

    qb.orderBy('claim.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // READ ONE
  // ============================================
  async findOne(
    id: string,
    warrantyId: string,
    tenantId: string,
  ): Promise<WarrantyClaim> {
    await this.verifyWarranty(warrantyId, tenantId);

    const claim = await this.claimsRepository.findOne({
      where: { id, warrantyId },
      relations: ['assignedTo', 'createdBy', 'resolvedBy', 'warranty'],
    });

    if (!claim) {
      throw new NotFoundException(`Reclamo ${id} no encontrado`);
    }

    return claim;
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(
    id: string,
    dto: UpdateClaimDto,
    warrantyId: string,
    tenantId: string,
  ): Promise<WarrantyClaim> {
    const claim = await this.findOne(id, warrantyId, tenantId);

    if (
      claim.status === ClaimStatus.RESOLVED ||
      claim.status === ClaimStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `No se puede editar un reclamo en estado ${claim.status}`,
      );
    }

    if (dto.assignedToId) {
      const worker = await this.workersRepository.findOne({
        where: { id: dto.assignedToId, tenantId },
      });
      if (!worker) {
        throw new BadRequestException('Worker no encontrado');
      }
    }

    Object.assign(claim, dto);
    return this.claimsRepository.save(claim);
  }

  // ============================================
  // START REVIEW (open → in_review)
  // ============================================
  async startReview(
    id: string,
    warrantyId: string,
    tenantId: string,
  ): Promise<WarrantyClaim> {
    const claim = await this.findOne(id, warrantyId, tenantId);

    if (claim.status !== ClaimStatus.OPEN) {
      throw new BadRequestException(
        `Solo se puede revisar un reclamo abierto. Estado: ${claim.status}`,
      );
    }

    claim.status = ClaimStatus.IN_REVIEW;
    claim.reviewedAt = new Date();

    this.logger.log(`🔍 Reclamo en revisión: ${claim.claimNumber}`);
    return this.claimsRepository.save(claim);
  }

  // ============================================
  // APPROVE (in_review → approved)
  // ============================================
  async approve(
    id: string,
    warrantyId: string,
    tenantId: string,
  ): Promise<WarrantyClaim> {
    const claim = await this.findOne(id, warrantyId, tenantId);

    if (claim.status !== ClaimStatus.IN_REVIEW) {
      throw new BadRequestException(
        `Solo se puede aprobar un reclamo en revisión. Estado: ${claim.status}`,
      );
    }

    claim.status = ClaimStatus.APPROVED;

    this.logger.log(`✅ Reclamo aprobado: ${claim.claimNumber}`);
    return this.claimsRepository.save(claim);
  }

  // ============================================
  // REJECT (cualquier estado abierto)
  // ============================================
  async reject(
    id: string,
    reason: string,
    warrantyId: string,
    tenantId: string,
    userId?: string,
  ): Promise<WarrantyClaim> {
    const claim = await this.findOne(id, warrantyId, tenantId);

    if (
      claim.status === ClaimStatus.RESOLVED ||
      claim.status === ClaimStatus.CANCELLED ||
      claim.status === ClaimStatus.REJECTED
    ) {
      throw new BadRequestException(
        `No se puede rechazar un reclamo en estado ${claim.status}`,
      );
    }

    claim.status = ClaimStatus.REJECTED;
    claim.rejectionReason = reason;
    claim.resolvedById = userId;
    claim.resolvedAt = new Date();

    await this.claimsRepository.save(claim);
    await this.updateWarrantyStats(warrantyId, tenantId);

    this.logger.log(`❌ Reclamo rechazado: ${claim.claimNumber}`);
    return this.findOne(id, warrantyId, tenantId);
  }

  // ============================================
  // RESOLVE (approved o in_review → resolved)
  // ============================================
  async resolve(
    id: string,
    dto: ResolveClaimDto,
    warrantyId: string,
    tenantId: string,
    userId?: string,
  ): Promise<WarrantyClaim> {
    const claim = await this.findOne(id, warrantyId, tenantId);

    if (
      claim.status !== ClaimStatus.IN_REVIEW &&
      claim.status !== ClaimStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Solo se puede resolver un reclamo en revisión o aprobado. Estado: ${claim.status}`,
      );
    }

    claim.status = ClaimStatus.RESOLVED;
    claim.resolution = dto.resolution;
    claim.coveredCost = dto.coveredCost || 0;
    claim.customerCost = dto.customerCost || 0;
    claim.resolvedById = userId;
    claim.resolvedAt = new Date();

    if (dto.notes) {
      claim.notes = `${claim.notes || ''}\n[Resolución]: ${dto.notes}`;
    }

    await this.claimsRepository.save(claim);
    await this.updateWarrantyStats(warrantyId, tenantId);

    this.logger.log(
      `✅ Reclamo resuelto: ${claim.claimNumber} (cubierto: $${claim.coveredCost})`,
    );
    return this.findOne(id, warrantyId, tenantId);
  }

  // ============================================
  // CANCEL
  // ============================================
  async cancel(
    id: string,
    warrantyId: string,
    tenantId: string,
  ): Promise<WarrantyClaim> {
    const claim = await this.findOne(id, warrantyId, tenantId);

    if (claim.status === ClaimStatus.RESOLVED) {
      throw new BadRequestException(
        'No se puede cancelar un reclamo ya resuelto',
      );
    }

    claim.status = ClaimStatus.CANCELLED;

    await this.claimsRepository.save(claim);
    await this.updateWarrantyStats(warrantyId, tenantId);

    this.logger.log(`🚫 Reclamo cancelado: ${claim.claimNumber}`);
    return this.findOne(id, warrantyId, tenantId);
  }

  // ============================================
  // DELETE (solo open)
  // ============================================
  async remove(
    id: string,
    warrantyId: string,
    tenantId: string,
  ): Promise<{ message: string }> {
    const claim = await this.findOne(id, warrantyId, tenantId);

    if (claim.status !== ClaimStatus.OPEN) {
      throw new BadRequestException(
        'Solo se pueden eliminar reclamos abiertos',
      );
    }

    await this.claimsRepository.remove(claim);
    await this.updateWarrantyStats(warrantyId, tenantId);

    return { message: 'Reclamo eliminado' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(warrantyId: string, tenantId: string) {
    await this.verifyWarranty(warrantyId, tenantId);

    const total = await this.claimsRepository.count({
      where: { warrantyId },
    });

    const byStatus = await this.claimsRepository
      .createQueryBuilder('claim')
      .select('claim.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('claim.warrantyId = :warrantyId', { warrantyId })
      .groupBy('claim.status')
      .getRawMany();

    const byPriority = await this.claimsRepository
      .createQueryBuilder('claim')
      .select('claim.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .where('claim.warrantyId = :warrantyId', { warrantyId })
      .groupBy('claim.priority')
      .getRawMany();

    const costs = await this.claimsRepository
      .createQueryBuilder('claim')
      .select('SUM(claim.coveredCost)', 'totalCovered')
      .addSelect('SUM(claim.customerCost)', 'totalCustomer')
      .where('claim.warrantyId = :warrantyId', { warrantyId })
      .andWhere('claim.status = :status', { status: ClaimStatus.RESOLVED })
      .getRawOne();

    return {
      total,
      byStatus,
      byPriority,
      totalCovered: parseFloat(costs?.totalCovered || 0),
      totalCustomer: parseFloat(costs?.totalCustomer || 0),
    };
  }

  // ============================================
  // UPDATE WARRANTY STATS
  // ============================================
  private async updateWarrantyStats(
    warrantyId: string,
    tenantId: string,
  ): Promise<void> {
    const warranty = await this.warrantiesRepository.findOne({
      where: { id: warrantyId, tenantId },
      relations: ['claims'],
    });

    if (!warranty) return;

    const claims = warranty.claims || [];
    const coveredCost = claims
      .filter(
        (c) =>
          c.status === ClaimStatus.RESOLVED || c.status === ClaimStatus.APPROVED,
      )
      .reduce((sum, c) => sum + Number(c.coveredCost || 0), 0);

    warranty.claimsCount = claims.length;
    warranty.claimsCost = coveredCost;

    const hasActiveClaims = claims.some(
      (c) =>
        c.status === ClaimStatus.OPEN || c.status === ClaimStatus.IN_REVIEW,
    );

    if (hasActiveClaims && warranty.status === 'active') {
      warranty.status = 'claimed' as any;
    }

    await this.warrantiesRepository.save(warranty);
  }
}