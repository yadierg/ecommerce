// apps/budget-api/src/modules/budgets/budgets.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Budget,
  BudgetItem,
  BudgetLaborItem,
  BudgetStatus,
  Client,
  Warehouse,
  Product,
} from '@ecommerce/core';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { QueryBudgetDto } from './dto/query-budget.dto';

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
    @InjectRepository(BudgetItem)
    private readonly itemsRepository: Repository<BudgetItem>,
    @InjectRepository(BudgetLaborItem)
    private readonly laborRepository: Repository<BudgetLaborItem>,
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
    @InjectRepository(Warehouse)
    private readonly warehousesRepository: Repository<Warehouse>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  // ============================================
  // GENERAR NÚMERO
  // ============================================
  private async generateBudgetNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const prefix = `BUD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.budgetsRepository.count({ where: { tenantId } });
    const sequence = String(count + 1).padStart(5, '0');

    return `${prefix}-${sequence}`;
  }

  // ============================================
  // CREATE
  // ============================================
  async create(
    dto: CreateBudgetDto,
    tenantId: string,
    userId?: string,
  ): Promise<Budget> {
    // Verificar cliente
    const client = await this.clientsRepository.findOne({
      where: { id: dto.clientId, tenantId },
    });
    if (!client) {
      throw new BadRequestException('Cliente no encontrado');
    }

    // Verificar almacén
    const warehouse = await this.warehousesRepository.findOne({
      where: { id: dto.warehouseId, tenantId },
    });
    if (!warehouse) {
      throw new BadRequestException('Almacén no encontrado');
    }

    // Generar número
    const budgetNumber = await this.generateBudgetNumber(tenantId);

    // ============================================
    // CALCULAR MATERIALES (con snapshot)
    // ============================================
    let materialsSubtotal = 0;
    let materialsTax = 0;

    const items: BudgetItem[] = [];

    for (let index = 0; index < dto.items.length; index++) {
      const item = dto.items[index];

      // Obtener producto (con validación)
      const product = await this.productsRepository.findOne({
        where: { id: item.productId, tenantId },
      });

      if (!product) {
        throw new BadRequestException(
          `Producto ${item.productId} no encontrado`,
        );
      }

      const subtotal = item.quantity * item.unitPrice - (item.discount || 0);
      const tax = subtotal * ((item.taxRate || 0) / 100);

      materialsSubtotal += subtotal;
      materialsTax += tax;

      // Crear item CON snapshot
      const budgetItem = this.itemsRepository.create({
        productId: item.productId,
        productName: product.name,
        productSku: product.sku,
        productDescription: product.shortDescription || product.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        discount: item.discount || 0,
        subtotal,
        order: index + 1,
        notes: item.notes,
      });

      items.push(budgetItem);
    }

    // ============================================
    // CALCULAR MANO DE OBRA
    // ============================================
    let laborSubtotal = 0;

    const laborItems: BudgetLaborItem[] = [];

    for (let index = 0; index < (dto.laborItems || []).length; index++) {
      const item = dto.laborItems[index];
      const subtotal = item.quantity * item.estimatedHours * item.hourlyRate;
      laborSubtotal += subtotal;

      const laborItem = this.laborRepository.create({
        description: item.description,
        workerRole: item.workerRole,
        quantity: item.quantity,
        estimatedHours: item.estimatedHours,
        hourlyRate: item.hourlyRate,
        subtotal,
        order: index + 1,
        notes: item.notes,
      });

      laborItems.push(laborItem);
    }

    // ============================================
    // CALCULAR TOTALES
    // ============================================
    const additionalCosts = dto.additionalCosts || 0;
    const subtotal = materialsSubtotal + laborSubtotal + additionalCosts;
    const tax = materialsTax;
    const discount = dto.discount || 0;
    const total = subtotal + tax - discount;

    // ============================================
    // CREAR BUDGET
    // ============================================
    const budget = this.budgetsRepository.create({
      tenantId,
      clientId: dto.clientId,
      warehouseId: dto.warehouseId,
      createdById: userId,
      budgetNumber,
      projectTitle: dto.projectTitle,
      projectDescription: dto.projectDescription,
      siteAddress: dto.siteAddress,
      siteCity: dto.siteCity,
      siteState: dto.siteState,
      siteCountry: dto.siteCountry,
      status: BudgetStatus.DRAFT,
      issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
      validUntil: new Date(dto.validUntil),
      estimatedStartDate: dto.estimatedStartDate
        ? new Date(dto.estimatedStartDate)
        : undefined,
      estimatedDurationDays: dto.estimatedDurationDays,
      materialsSubtotal,
      laborSubtotal,
      additionalCosts,
      subtotal,
      tax,
      discount,
      total,
      currency: dto.currency || 'USD',
      paymentTerms: dto.paymentTerms || 0,
      warrantyMonths: dto.warrantyMonths ?? 12,
      notes: dto.notes,
      termsAndConditions: dto.termsAndConditions,
      internalReference: dto.internalReference,
      items,
      laborItems,
    });

    const saved = await this.budgetsRepository.save(budget);

    this.logger.log(
      `📝 Presupuesto creado: ${saved.budgetNumber} - Total: ${saved.total} ${saved.currency}`,
    );

    return saved;
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(query: QueryBudgetDto, tenantId: string) {
    const { page = 1, limit = 20, search, from, to, ...filters } = query;
    const skip = (page - 1) * limit;

    const qb = this.budgetsRepository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.client', 'client')
      .leftJoinAndSelect('budget.warehouse', 'warehouse')
      .where('budget.tenantId = :tenantId', { tenantId });

    if (filters.clientId) {
      qb.andWhere('budget.clientId = :clientId', { clientId: filters.clientId });
    }

    if (filters.warehouseId) {
      qb.andWhere('budget.warehouseId = :warehouseId', {
        warehouseId: filters.warehouseId,
      });
    }

    if (filters.status) {
      qb.andWhere('budget.status = :status', { status: filters.status });
    }

    if (search) {
      qb.andWhere(
        '(budget.budgetNumber ILIKE :search OR budget.projectTitle ILIKE :search OR budget.siteAddress ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (from && to) {
      qb.andWhere('budget.issueDate BETWEEN :from AND :to', { from, to });
    }

    qb.orderBy('budget.createdAt', 'DESC').skip(skip).take(limit);

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
  async findOne(id: string, tenantId: string): Promise<Budget> {
    const budget = await this.budgetsRepository.findOne({
      where: { id, tenantId },
      relations: [
        'items',
        'items.product',
        'laborItems',
        'client',
        'warehouse',
        'createdBy',
        'approvedBy',
      ],
    });

    if (!budget) {
      throw new NotFoundException(`Presupuesto ${id} no encontrado`);
    }

    return budget;
  }

  // ============================================
  // READ BY NUMBER
  // ============================================
  async findByNumber(
    budgetNumber: string,
    tenantId: string,
  ): Promise<Budget> {
    const budget = await this.budgetsRepository.findOne({
      where: { budgetNumber, tenantId },
      relations: ['items', 'items.product', 'laborItems', 'client', 'warehouse'],
    });

    if (!budget) {
      throw new NotFoundException(`Presupuesto ${budgetNumber} no encontrado`);
    }

    return budget;
  }

  // ============================================
  // UPDATE (solo draft)
  // ============================================
  async update(
    id: string,
    dto: UpdateBudgetDto,
    tenantId: string,
  ): Promise<Budget> {
    const budget = await this.findOne(id, tenantId);

    if (budget.status !== BudgetStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden editar presupuestos en borrador',
      );
    }

    Object.assign(budget, dto);
    return this.budgetsRepository.save(budget);
  }

  // ============================================
  // SEND (draft → sent)
  // ============================================
  async send(id: string, tenantId: string): Promise<Budget> {
    const budget = await this.findOne(id, tenantId);

    if (budget.status !== BudgetStatus.DRAFT) {
      throw new BadRequestException(
        `Solo se puede enviar un presupuesto en borrador (estado actual: ${budget.status})`,
      );
    }

    if (new Date() > budget.validUntil) {
      throw new BadRequestException('El presupuesto ya expiró');
    }

    budget.status = BudgetStatus.SENT;
    budget.sentAt = new Date();

    this.logger.log(`📤 Presupuesto enviado: ${budget.budgetNumber}`);
    return this.budgetsRepository.save(budget);
  }

  // ============================================
  // APPROVE (sent → approved)
  // ============================================
  async approve(
    id: string,
    tenantId: string,
    userId?: string,
  ): Promise<Budget> {
    const budget = await this.findOne(id, tenantId);

    if (budget.status !== BudgetStatus.SENT) {
      throw new BadRequestException(
        `Solo se puede aprobar un presupuesto enviado (estado actual: ${budget.status})`,
      );
    }

    budget.status = BudgetStatus.APPROVED;
    budget.approvedAt = new Date();
    budget.approvedById = userId;

    this.logger.log(`✅ Presupuesto aprobado: ${budget.budgetNumber}`);
    return this.budgetsRepository.save(budget);
  }

  // ============================================
  // REJECT (sent → rejected)
  // ============================================
  async reject(
    id: string,
    reason: string,
    tenantId: string,
  ): Promise<Budget> {
    const budget = await this.findOne(id, tenantId);

    if (budget.status !== BudgetStatus.SENT) {
      throw new BadRequestException(
        `Solo se puede rechazar un presupuesto enviado (estado actual: ${budget.status})`,
      );
    }

    budget.status = BudgetStatus.REJECTED;
    budget.rejectedAt = new Date();
    budget.notes = `${budget.notes || ''}\n[Rechazado]: ${reason}`;

    this.logger.log(`❌ Presupuesto rechazado: ${budget.budgetNumber}`);
    return this.budgetsRepository.save(budget);
  }

  // ============================================
  // CANCEL (cualquier estado excepto converted)
  // ============================================
  async cancel(id: string, tenantId: string): Promise<Budget> {
    const budget = await this.findOne(id, tenantId);

    if (budget.status === BudgetStatus.CONVERTED) {
      throw new BadRequestException(
        'No se puede cancelar un presupuesto ya convertido en proyecto',
      );
    }

    budget.status = BudgetStatus.CANCELLED;
    return this.budgetsRepository.save(budget);
  }

  // ============================================
  // DELETE (solo draft)
  // ============================================
  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const budget = await this.findOne(id, tenantId);

    if (budget.status !== BudgetStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden eliminar presupuestos en borrador',
      );
    }

    await this.budgetsRepository.remove(budget);
    return { message: 'Presupuesto eliminado' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId: string) {
    const total = await this.budgetsRepository.count({ where: { tenantId } });

    const byStatus = await this.budgetsRepository
      .createQueryBuilder('budget')
      .select('budget.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(budget.total)', 'total')
      .where('budget.tenantId = :tenantId', { tenantId })
      .groupBy('budget.status')
      .getRawMany();

    const totals = await this.budgetsRepository
      .createQueryBuilder('budget')
      .select('SUM(budget.total)', 'totalAll')
      .addSelect('AVG(budget.total)', 'avgTotal')
      .where('budget.tenantId = :tenantId', { tenantId })
      .getRawOne();

    const approvedTotals = await this.budgetsRepository
      .createQueryBuilder('budget')
      .select('SUM(budget.total)', 'total')
      .where('budget.tenantId = :tenantId', { tenantId })
      .andWhere('budget.status IN (:...statuses)', {
        statuses: [BudgetStatus.APPROVED, BudgetStatus.CONVERTED],
      })
      .getRawOne();

    const conversionRate = await this.budgetsRepository
      .createQueryBuilder('budget')
      .select(
        `SUM(CASE WHEN budget.status IN ('approved', 'converted') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)`,
        'rate',
      )
      .where('budget.tenantId = :tenantId', { tenantId })
      .getRawOne();

    const expiringSoon = await this.budgetsRepository
      .createQueryBuilder('budget')
      .where('budget.tenantId = :tenantId', { tenantId })
      .andWhere('budget.status = :status', { status: BudgetStatus.SENT })
      .andWhere('budget.validUntil <= :date', {
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .andWhere('budget.validUntil >= :now', { now: new Date() })
      .getCount();

    return {
      total,
      byStatus,
      totalValue: parseFloat(totals?.totalAll || 0),
      avgValue: parseFloat(totals?.avgTotal || 0),
      approvedValue: parseFloat(approvedTotals?.total || 0),
      conversionRate: parseFloat(conversionRate?.rate || 0),
      expiringSoon,
    };
  }
}