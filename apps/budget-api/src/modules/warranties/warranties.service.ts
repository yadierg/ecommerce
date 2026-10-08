// apps/budget-api/src/modules/warranties/warranties.service.ts
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
  WarrantyStatus,
  WarrantyCoveredItem,
  Project,
  ProjectMaterial,
  Invoice,
  Budget,
  Client,
} from '@ecommerce/core';
import { CreateWarrantyDto } from './dto/create-warranty.dto';
import { UpdateWarrantyDto } from './dto/update-warranty.dto';
import { QueryWarrantyDto } from './dto/query-warranty.dto';

@Injectable()
export class WarrantiesService {
  private readonly logger = new Logger(WarrantiesService.name);

  constructor(
    @InjectRepository(Warranty)
    private readonly warrantiesRepository: Repository<Warranty>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectMaterial)
    private readonly materialsRepository: Repository<ProjectMaterial>,
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
  ) {}

  // ============================================
  // GENERAR NÚMERO
  // ============================================
  private async generateWarrantyNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const prefix = `WAR-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.warrantiesRepository.count({
      where: { tenantId },
    });
    const sequence = String(count + 1).padStart(5, '0');

    return `${prefix}-${sequence}`;
  }

  // ============================================
  // CREATE (manual)
  // ============================================
  async create(
    dto: CreateWarrantyDto,
    tenantId: string,
    userId?: string,
  ): Promise<Warranty> {
    // Verificar proyecto
    const project = await this.projectsRepository.findOne({
      where: { id: dto.projectId, tenantId },
    });

    if (!project) {
      throw new NotFoundException(`Proyecto ${dto.projectId} no encontrado`);
    }

    // Validar que no exista warranty activa para este proyecto
    const existing = await this.warrantiesRepository.findOne({
      where: {
        projectId: dto.projectId,
        tenantId,
        status: WarrantyStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `El proyecto ya tiene una garantía activa: ${existing.warrantyNumber}`,
      );
    }

    // Fechas
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + dto.monthsDuration);

    // Covered items (convertir si vienen)
    let coveredItems: WarrantyCoveredItem[] = [];
    if (dto.coveredItems && dto.coveredItems.length > 0) {
      coveredItems = dto.coveredItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        serialNumber: item.serialNumber,
        quantity: item.quantity,
        installedAt: new Date(item.installedAt),
        warrantyMonths: item.warrantyMonths,
        specificEndDate: new Date(item.specificEndDate),
      }));
    }

    // Generar número
    const warrantyNumber = await this.generateWarrantyNumber(tenantId);

    const warranty = this.warrantiesRepository.create({
      tenantId,
      projectId: dto.projectId,
      clientId: project.clientId,
      invoiceId: dto.invoiceId,
      createdById: userId,
      warrantyNumber,
      status: WarrantyStatus.ACTIVE,
      startDate,
      endDate,
      monthsDuration: dto.monthsDuration,
      coveredItems,
      terms: dto.terms,
      notes: dto.notes,
    });

    const saved = await this.warrantiesRepository.save(warranty);

    this.logger.log(`🛡️ Garantía creada: ${saved.warrantyNumber}`);

    return this.findOne(saved.id, tenantId);
  }

  // ============================================
  // CREATE FROM INVOICE (auto)
  // ============================================
  async createFromInvoice(
    invoiceId: string,
    tenantId: string,
    userId?: string,
  ): Promise<Warranty> {
    // Obtener la factura
    const invoice = await this.invoicesRepository.findOne({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException(`Factura ${invoiceId} no encontrada`);
    }

    // Verificar que no exista warranty
    const existing = await this.warrantiesRepository.findOne({
      where: { invoiceId, tenantId },
    });

    if (existing) {
      this.logger.warn(
        `⚠️ Factura ${invoice.invoiceNumber} ya tiene garantía: ${existing.warrantyNumber}`,
      );
      return this.findOne(existing.id, tenantId);
    }

    // Obtener el proyecto
    const project = await this.projectsRepository.findOne({
      where: { id: invoice.projectId, tenantId },
    });

    if (!project) {
      throw new NotFoundException(`Proyecto ${invoice.projectId} no encontrado`);
    }

    // Obtener meses de garantía del presupuesto
    let warrantyMonths = 12; // default
    if (invoice.budgetId) {
      const budget = await this.budgetsRepository.findOne({
        where: { id: invoice.budgetId, tenantId },
      });
      if (budget && budget.warrantyMonths) {
        warrantyMonths = budget.warrantyMonths;
      }
    }

    // Obtener materiales consumidos del proyecto
    const materials = await this.materialsRepository.find({
      where: { projectId: invoice.projectId },
    });

    // Fecha de instalación = fecha de la factura
    const installedAt = invoice.issueDate || new Date();

    // Construir covered items (solo materiales consumidos)
    const coveredItems: WarrantyCoveredItem[] = materials
      .filter((m) => Number(m.quantityUsed) > 0)
      .map((m) => {
        const specificEndDate = new Date(installedAt);
        specificEndDate.setMonth(specificEndDate.getMonth() + warrantyMonths);

        return {
          productId: m.productId,
          productName: m.productName,
          productSku: m.productSku,
          quantity: Number(m.quantityUsed),
          installedAt: new Date(installedAt),
          warrantyMonths,
          specificEndDate,
        };
      });

    // Crear warranty
    const startDate = new Date(installedAt);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + warrantyMonths);

    const warrantyNumber = await this.generateWarrantyNumber(tenantId);

    const warranty = this.warrantiesRepository.create({
      tenantId,
      projectId: invoice.projectId,
      clientId: invoice.clientId,
      invoiceId: invoice.id,
      createdById: userId,
      warrantyNumber,
      status: WarrantyStatus.ACTIVE,
      startDate,
      endDate,
      monthsDuration: warrantyMonths,
      coveredItems,
      notes: `Garantía activada automáticamente al pagar factura ${invoice.invoiceNumber}`,
    });

    const saved = await this.warrantiesRepository.save(warranty);

    this.logger.log(
      `🛡️ Garantía auto-creada: ${saved.warrantyNumber} (${warrantyMonths} meses, ${coveredItems.length} items)`,
    );

    return this.findOne(saved.id, tenantId);
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(query: QueryWarrantyDto, tenantId: string) {
    const { page = 1, limit = 20, search, from, to, ...filters } = query;
    const skip = (page - 1) * limit;

    const qb = this.warrantiesRepository
      .createQueryBuilder('warranty')
      .leftJoinAndSelect('warranty.client', 'client')
      .leftJoinAndSelect('warranty.project', 'project')
      .where('warranty.tenantId = :tenantId', { tenantId });

    if (filters.projectId) {
      qb.andWhere('warranty.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }

    if (filters.clientId) {
      qb.andWhere('warranty.clientId = :clientId', {
        clientId: filters.clientId,
      });
    }

    if (filters.status) {
      qb.andWhere('warranty.status = :status', { status: filters.status });
    }

    if (search) {
      qb.andWhere(
        '(warranty.warrantyNumber ILIKE :search OR client.name ILIKE :search OR project.projectNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (from && to) {
      qb.andWhere('warranty.startDate BETWEEN :from AND :to', { from, to });
    }

    qb.orderBy('warranty.createdAt', 'DESC').skip(skip).take(limit);

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
  async findOne(id: string, tenantId: string): Promise<Warranty> {
    const warranty = await this.warrantiesRepository.findOne({
      where: { id, tenantId },
      relations: ['client', 'project', 'invoice', 'claims'],
    });

    if (!warranty) {
      throw new NotFoundException(`Garantía ${id} no encontrada`);
    }

    return warranty;
  }

  // ============================================
  // READ BY NUMBER
  // ============================================
  async findByNumber(
    warrantyNumber: string,
    tenantId: string,
  ): Promise<Warranty> {
    const warranty = await this.warrantiesRepository.findOne({
      where: { warrantyNumber, tenantId },
      relations: ['client', 'project', 'invoice', 'claims'],
    });

    if (!warranty) {
      throw new NotFoundException(`Garantía ${warrantyNumber} no encontrada`);
    }

    return warranty;
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(
    id: string,
    dto: UpdateWarrantyDto,
    tenantId: string,
  ): Promise<Warranty> {
    const warranty = await this.findOne(id, tenantId);

    if (warranty.status !== WarrantyStatus.ACTIVE) {
      throw new BadRequestException(
        `Solo se pueden editar garantías activas. Estado: ${warranty.status}`,
      );
    }

    if (dto.endDate) (dto as any).endDate = new Date(dto.endDate);

    Object.assign(warranty, dto);
    return this.warrantiesRepository.save(warranty);
  }

  // ============================================
  // VOID
  // ============================================
  async void(
    id: string,
    reason: string,
    tenantId: string,
  ): Promise<Warranty> {
    const warranty = await this.findOne(id, tenantId);

    if (warranty.status !== WarrantyStatus.ACTIVE) {
      throw new BadRequestException(
        `Solo se pueden anular garantías activas. Estado: ${warranty.status}`,
      );
    }

    warranty.status = WarrantyStatus.VOIDED;
    warranty.notes = `${warranty.notes || ''}\n[Anulada]: ${reason}`;

    this.logger.warn(`🚫 Garantía anulada: ${warranty.warrantyNumber}`);
    return this.warrantiesRepository.save(warranty);
  }

  // ============================================
  // RENEW
  // ============================================
  async renew(
    id: string,
    months: number,
    tenantId: string,
    userId?: string,
  ): Promise<Warranty> {
    const original = await this.findOne(id, tenantId);

    if (
      original.status !== WarrantyStatus.ACTIVE &&
      original.status !== WarrantyStatus.EXPIRED
    ) {
      throw new BadRequestException(
        `Solo se pueden renovar garantías activas o vencidas. Estado: ${original.status}`,
      );
    }

    // Marcar original como renovada
    original.status = WarrantyStatus.RENEWED;
    await this.warrantiesRepository.save(original);

    // Crear nueva
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);

    // Copiar covered items y extender sus fechas
    const coveredItems: WarrantyCoveredItem[] = original.coveredItems.map(
      (item) => {
        const specificEndDate = new Date(startDate);
        specificEndDate.setMonth(
          specificEndDate.getMonth() + item.warrantyMonths + months,
        );

        return {
          ...item,
          specificEndDate,
        };
      },
    );

    const warrantyNumber = await this.generateWarrantyNumber(tenantId);

    const renewal = this.warrantiesRepository.create({
      tenantId,
      projectId: original.projectId,
      clientId: original.clientId,
      invoiceId: original.invoiceId,
      createdById: userId,
      warrantyNumber,
      status: WarrantyStatus.ACTIVE,
      startDate,
      endDate,
      monthsDuration: months,
      coveredItems,
      renewedFromId: original.id,
      terms: original.terms,
      notes: `Renovación de garantía ${original.warrantyNumber} por ${months} meses`,
    });

    const saved = await this.warrantiesRepository.save(renewal);

    // Link bidireccional
    original.renewedToId = saved.id;
    await this.warrantiesRepository.save(original);

    this.logger.log(
      `🔄 Garantía renovada: ${original.warrantyNumber} → ${saved.warrantyNumber}`,
    );

    return this.findOne(saved.id, tenantId);
  }

  // ============================================
  // UPDATE STATS (llamado al crear/rechazar claim)
  // ============================================
  async updateClaimStats(
    id: string,
    tenantId: string,
  ): Promise<void> {
    const warranty = await this.warrantiesRepository.findOne({
      where: { id, tenantId },
      relations: ['claims'],
    });

    if (!warranty) return;

    const claims = warranty.claims || [];
    const coveredCost = claims
      .filter((c) => c.status === 'resolved' || c.status === 'approved')
      .reduce((sum, c) => sum + Number(c.coveredCost || 0), 0);

    warranty.claimsCount = claims.length;
    warranty.claimsCost = coveredCost;

    // Si hay claims activos, marcar como claimed
    const hasActiveClaims = claims.some(
      (c) => c.status === 'open' || c.status === 'in_review',
    );

    if (hasActiveClaims && warranty.status === WarrantyStatus.ACTIVE) {
      warranty.status = WarrantyStatus.CLAIMED;
    }

    await this.warrantiesRepository.save(warranty);
  }

  // ============================================
  // CHECK EXPIRED (cronjob)
  // ============================================
  async checkExpiredWarranties(tenantId?: string): Promise<number> {
    const qb = this.warrantiesRepository
      .createQueryBuilder('warranty')
      .update(Warranty)
      .set({ status: WarrantyStatus.EXPIRED })
      .where('warranty.status IN (:...statuses)', {
        statuses: [WarrantyStatus.ACTIVE, WarrantyStatus.CLAIMED],
      })
      .andWhere('warranty.endDate < :now', { now: new Date() });

    if (tenantId) {
      qb.andWhere('warranty.tenantId = :tenantId', { tenantId });
    }

    const result = await qb.execute();
    const count = result.affected || 0;

    if (count > 0) {
      this.logger.warn(`⚠️ ${count} garantía(s) marcada(s) como vencida(s)`);
    }

    return count;
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId: string) {
    const total = await this.warrantiesRepository.count({
      where: { tenantId },
    });

    const byStatus = await this.warrantiesRepository
      .createQueryBuilder('warranty')
      .select('warranty.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('warranty.tenantId = :tenantId', { tenantId })
      .groupBy('warranty.status')
      .getRawMany();

    const claimsTotals = await this.warrantiesRepository
      .createQueryBuilder('warranty')
      .select('SUM(warranty.claimsCount)', 'totalClaims')
      .addSelect('SUM(warranty.claimsCost)', 'totalClaimsCost')
      .where('warranty.tenantId = :tenantId', { tenantId })
      .getRawOne();

    // Garantías que vencen en 30 días
    const expiringSoon = await this.warrantiesRepository
      .createQueryBuilder('warranty')
      .where('warranty.tenantId = :tenantId', { tenantId })
      .andWhere('warranty.status IN (:...statuses)', {
        statuses: [WarrantyStatus.ACTIVE, WarrantyStatus.CLAIMED],
      })
      .andWhere('warranty.endDate <= :date', {
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .andWhere('warranty.endDate >= :now', { now: new Date() })
      .getCount();

    // Total de items cubiertos
    const allWarranties = await this.warrantiesRepository.find({
      where: { tenantId, status: WarrantyStatus.ACTIVE },
    });

    const totalCoveredItems = allWarranties.reduce(
      (sum, w) => sum + (w.coveredItems?.length || 0),
      0,
    );

    return {
      total,
      byStatus,
      totalClaims: parseInt(claimsTotals?.totalClaims || '0', 10),
      totalClaimsCost: parseFloat(claimsTotals?.totalClaimsCost || 0),
      expiringSoon,
      totalCoveredItems,
    };
  }

  // ============================================
  // BY CLIENT
  // ============================================
  async findByClient(clientId: string, tenantId: string) {
    return this.warrantiesRepository.find({
      where: { clientId, tenantId },
      relations: ['project', 'claims'],
      order: { createdAt: 'DESC' },
    });
  }
}