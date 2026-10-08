// apps/budget-api/src/modules/invoices/invoices.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Invoice,
  InvoiceStatus,
  Project,
  ProjectStatus,
  Budget,
} from '@ecommerce/core';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { MarkAsPaidDto } from './dto/mark-as-paid.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
  ) {}

  // ============================================
  // GENERAR NÚMERO
  // ============================================
  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const prefix = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.invoicesRepository.count({ where: { tenantId } });
    const sequence = String(count + 1).padStart(5, '0');

    return `${prefix}-${sequence}`;
  }

  // ============================================
  // CREATE (generar factura desde proyecto)
  // ============================================
  async create(
    dto: CreateInvoiceDto,
    tenantId: string,
    userId?: string,
  ): Promise<Invoice> {
    // 1. Obtener el proyecto
    const project = await this.projectsRepository.findOne({
      where: { id: dto.projectId, tenantId },
    });

    if (!project) {
      throw new NotFoundException(`Proyecto ${dto.projectId} no encontrado`);
    }

    // 2. Validar que esté completado
    if (project.status !== ProjectStatus.COMPLETED) {
      throw new BadRequestException(
        `Solo se pueden facturar proyectos completados. Estado actual: ${project.status}`,
      );
    }

    // 3. Validar que no exista factura ya
    const existing = await this.invoicesRepository.findOne({
      where: { projectId: dto.projectId, tenantId },
    });

    if (existing) {
      throw new BadRequestException(
        `El proyecto ya tiene una factura: ${existing.invoiceNumber}`,
      );
    }

    // 4. Calcular costos reales desde el proyecto
    const materialsCost = Number(project.materialsCostActual) || 0;
    const laborCost = Number(project.laborCostActual) || 0;
    const additionalCosts = Number(project.additionalCostsActual) || 0;

    const subtotal = materialsCost + laborCost + additionalCosts;
    const tax = Number(dto.tax) || 0;
    const discount = Number(dto.discount) || 0;
    const total = subtotal + tax - discount;

    // 5. Obtener el presupuesto original (si existe)
    let budgetTotal = 0;
    let budgetId: string | undefined;

    if (project.budgetId) {
      const budget = await this.budgetsRepository.findOne({
        where: { id: project.budgetId, tenantId },
      });

      if (budget) {
        budgetTotal = Number(budget.total) || 0;
        budgetId = budget.id;
      }
    }

    // 6. Calcular variación
    const variance = total - budgetTotal;
    const variancePercentage =
      budgetTotal > 0 ? (variance / budgetTotal) * 100 : 0;

    // 7. Generar número
    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    // 8. Fechas
    const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();
    const paymentTerms = dto.paymentTerms ?? 30;
    const dueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : new Date(issueDate.getTime() + paymentTerms * 24 * 60 * 60 * 1000);

    // 9. Crear factura
    const invoice = this.invoicesRepository.create({
      tenantId,
      projectId: project.id,
      clientId: project.clientId,
      budgetId,
      createdById: userId,
      invoiceNumber,
      status: InvoiceStatus.DRAFT,
      issueDate,
      dueDate,
      materialsCost,
      laborCost,
      additionalCosts,
      subtotal,
      tax,
      discount,
      total,
      budgetTotal,
      variance,
      variancePercentage,
      currency: dto.currency || 'USD',
      paymentTerms,
      notes: dto.notes,
      termsAndConditions: dto.termsAndConditions,
    });

    const saved = await this.invoicesRepository.save(invoice);

    this.logger.log(
      `💰 Factura creada: ${saved.invoiceNumber} - Total: ${saved.total} ${saved.currency}`,
    );

    return this.findOne(saved.id, tenantId);
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(query: QueryInvoiceDto, tenantId: string) {
    const { page = 1, limit = 20, search, from, to, ...filters } = query;
    const skip = (page - 1) * limit;

    const qb = this.invoicesRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.client', 'client')
      .leftJoinAndSelect('invoice.project', 'project')
      .where('invoice.tenantId = :tenantId', { tenantId });

    if (filters.projectId) {
      qb.andWhere('invoice.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }

    if (filters.clientId) {
      qb.andWhere('invoice.clientId = :clientId', {
        clientId: filters.clientId,
      });
    }

    if (filters.status) {
      qb.andWhere('invoice.status = :status', { status: filters.status });
    }

    if (search) {
      qb.andWhere(
        '(invoice.invoiceNumber ILIKE :search OR client.name ILIKE :search OR project.projectNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (from && to) {
      qb.andWhere('invoice.issueDate BETWEEN :from AND :to', { from, to });
    }

    qb.orderBy('invoice.createdAt', 'DESC').skip(skip).take(limit);

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
  async findOne(id: string, tenantId: string): Promise<Invoice> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id, tenantId },
      relations: ['client', 'project', 'budget', 'createdBy'],
    });

    if (!invoice) {
      throw new NotFoundException(`Factura ${id} no encontrada`);
    }

    return invoice;
  }

  // ============================================
  // READ BY NUMBER
  // ============================================
  async findByNumber(
    invoiceNumber: string,
    tenantId: string,
  ): Promise<Invoice> {
    const invoice = await this.invoicesRepository.findOne({
      where: { invoiceNumber, tenantId },
      relations: ['client', 'project', 'budget'],
    });

    if (!invoice) {
      throw new NotFoundException(`Factura ${invoiceNumber} no encontrada`);
    }

    return invoice;
  }

  // ============================================
  // UPDATE (solo draft)
  // ============================================
  async update(
    id: string,
    dto: UpdateInvoiceDto,
    tenantId: string,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id, tenantId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden editar facturas en borrador',
      );
    }

    // Recalcular si cambian tax/discount/additionalCosts
    if (
      dto.tax !== undefined ||
      dto.discount !== undefined ||
      dto.additionalCosts !== undefined
    ) {
      const materialsCost = Number(invoice.materialsCost) || 0;
      const laborCost = Number(invoice.laborCost) || 0;
      const additionalCosts =
        dto.additionalCosts !== undefined
          ? Number(dto.additionalCosts)
          : Number(invoice.additionalCosts) || 0;
      const tax =
        dto.tax !== undefined ? Number(dto.tax) : Number(invoice.tax) || 0;
      const discount =
        dto.discount !== undefined
          ? Number(dto.discount)
          : Number(invoice.discount) || 0;

      const subtotal = materialsCost + laborCost + additionalCosts;
      const total = subtotal + tax - discount;
      const budgetTotal = Number(invoice.budgetTotal) || 0;
      const variance = total - budgetTotal;
      const variancePercentage =
        budgetTotal > 0 ? (variance / budgetTotal) * 100 : 0;

      invoice.additionalCosts = additionalCosts;
      invoice.tax = tax;
      invoice.discount = discount;
      invoice.subtotal = subtotal;
      invoice.total = total;
      invoice.variance = variance;
      invoice.variancePercentage = variancePercentage;
    }

    if (dto.issueDate) (dto as any).issueDate = new Date(dto.issueDate);
    if (dto.dueDate) (dto as any).dueDate = new Date(dto.dueDate);

    // Aplicar resto de campos
    if (dto.notes !== undefined) invoice.notes = dto.notes;
    if (dto.termsAndConditions !== undefined)
      invoice.termsAndConditions = dto.termsAndConditions;

    return this.invoicesRepository.save(invoice);
  }

  // ============================================
  // SEND (draft → sent)
  // ============================================
  async send(id: string, tenantId: string): Promise<Invoice> {
    const invoice = await this.findOne(id, tenantId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        `Solo se puede enviar una factura en borrador. Estado: ${invoice.status}`,
      );
    }

    invoice.status = InvoiceStatus.SENT;
    invoice.sentAt = new Date();

    this.logger.log(`📤 Factura enviada: ${invoice.invoiceNumber}`);
    return this.invoicesRepository.save(invoice);
  }

  // ============================================
  // MARK AS PAID (sent → paid)
  // ============================================
  async markAsPaid(
    id: string,
    dto: MarkAsPaidDto,
    tenantId: string,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id, tenantId);

    if (
      invoice.status !== InvoiceStatus.SENT &&
      invoice.status !== InvoiceStatus.OVERDUE
    ) {
      throw new BadRequestException(
        `Solo se pueden pagar facturas enviadas o vencidas. Estado: ${invoice.status}`,
      );
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

    if (dto.paymentMethod) invoice.paymentMethod = dto.paymentMethod;
    if (dto.paymentReference) invoice.paymentReference = dto.paymentReference;

    if (dto.notes) {
      invoice.notes = `${invoice.notes || ''}\n[Pago]: ${dto.notes}`;
    }

    this.logger.log(`💰 Factura pagada: ${invoice.invoiceNumber}`);
    return this.invoicesRepository.save(invoice);
  }

  // ============================================
  // CANCEL
  // ============================================
  async cancel(id: string, tenantId: string): Promise<Invoice> {
    const invoice = await this.findOne(id, tenantId);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException(
        'No se puede cancelar una factura ya pagada. Usa "refund" en su lugar.',
      );
    }

    invoice.status = InvoiceStatus.CANCELLED;
    invoice.cancelledAt = new Date();

    this.logger.log(`❌ Factura cancelada: ${invoice.invoiceNumber}`);
    return this.invoicesRepository.save(invoice);
  }

  // ============================================
  // DELETE (solo draft)
  // ============================================
  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const invoice = await this.findOne(id, tenantId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden eliminar facturas en borrador',
      );
    }

    await this.invoicesRepository.remove(invoice);
    return { message: 'Factura eliminada' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId: string) {
    const total = await this.invoicesRepository.count({ where: { tenantId } });

    const byStatus = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .select('invoice.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(invoice.total)', 'total')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .groupBy('invoice.status')
      .getRawMany();

    const totals = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.total)', 'totalAll')
      .addSelect('AVG(invoice.total)', 'avgTotal')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .getRawOne();

    const paidTotals = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.total)', 'total')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.PAID })
      .getRawOne();

    const pendingTotals = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.total)', 'total')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE],
      })
      .getRawOne();

    const variances = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.variance)', 'totalVariance')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.PAID })
      .getRawOne();

    // Facturas que vencen en 7 días
    const expiringSoon = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.SENT })
      .andWhere('invoice.dueDate <= :date', {
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .andWhere('invoice.dueDate >= :now', { now: new Date() })
      .getCount();

    // Facturas vencidas (overdue)
    const overdueCount = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.SENT })
      .andWhere('invoice.dueDate < :now', { now: new Date() })
      .getCount();

    return {
      total,
      byStatus,
      totalValue: parseFloat(totals?.totalAll || 0),
      avgValue: parseFloat(totals?.avgTotal || 0),
      paidValue: parseFloat(paidTotals?.total || 0),
      pendingValue: parseFloat(pendingTotals?.total || 0),
      totalVariance: parseFloat(variances?.totalVariance || 0),
      expiringSoon,
      overdueCount,
    };
  }

  // ============================================
  // CHECK OVERDUE (para cronjob)
  // ============================================
  async checkOverdueInvoices(tenantId?: string): Promise<number> {
    const qb = this.invoicesRepository
      .createQueryBuilder('invoice')
      .update(Invoice)
      .set({ status: InvoiceStatus.OVERDUE })
      .where('invoice.status = :status', { status: InvoiceStatus.SENT })
      .andWhere('invoice.dueDate < :now', { now: new Date() });

    if (tenantId) {
      qb.andWhere('invoice.tenantId = :tenantId', { tenantId });
    }

    const result = await qb.execute();
    const count = result.affected || 0;

    if (count > 0) {
      this.logger.warn(`⚠️ ${count} factura(s) marcada(s) como vencida(s)`);
    }

    return count;
  }
}