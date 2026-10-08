// apps/budget-api/src/modules/projects/projects.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
import { ConvertBudgetToProjectDto } from './dto/convert-budget-to-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectPhase)
    private readonly phasesRepository: Repository<ProjectPhase>,
    @InjectRepository(ProjectMaterial)
    private readonly materialsRepository: Repository<ProjectMaterial>,
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
    @InjectRepository(Worker)
    private readonly workersRepository: Repository<Worker>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================
  // GENERAR NÚMERO
  // ============================================
  private async generateProjectNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const prefix = `PRJ-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.projectsRepository.count({ where: { tenantId } });
    const sequence = String(count + 1).padStart(5, '0');

    return `${prefix}-${sequence}`;
  }

  // ============================================
  // CONVERTIR BUDGET → PROJECT
  // ============================================
  async convertFromBudget(
    budgetId: string,
    dto: ConvertBudgetToProjectDto,
    tenantId: string,
    userId?: string,
  ): Promise<Project> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Obtener el presupuesto
      const budget = await manager.findOne(Budget, {
        where: { id: budgetId, tenantId },
        relations: ['items', 'laborItems'],
      });

      if (!budget) {
        throw new NotFoundException(`Presupuesto ${budgetId} no encontrado`);
      }

      // 2. Validar que esté aprobado
      if (budget.status !== BudgetStatus.APPROVED) {
        throw new BadRequestException(
          `Solo se pueden convertir presupuestos aprobados. Estado actual: ${budget.status}`,
        );
      }

      // 3. Validar que no esté ya convertido
      if (budget.convertedProjectId) {
        throw new BadRequestException(
          'Este presupuesto ya fue convertido en proyecto',
        );
      }

      // 4. Validar el Project Manager
      const manager_worker = await manager.findOne(Worker, {
        where: { id: dto.projectManagerId, tenantId },
      });

      if (!manager_worker) {
        throw new BadRequestException('Project Manager no encontrado');
      }

      // 5. Generar número de proyecto
      const projectNumber = await this.generateProjectNumber(tenantId);

      // 6. Crear el proyecto
      const project = manager.create(Project, {
        tenantId,
        budgetId: budget.id,
        clientId: budget.clientId,
        warehouseId: budget.warehouseId,
        projectManagerId: dto.projectManagerId,
        createdById: userId,
        projectNumber,
        title: budget.projectTitle,
        description: budget.projectDescription,
        siteAddress: budget.siteAddress,
        siteCity: budget.siteCity,
        siteState: budget.siteState,
        siteCountry: budget.siteCountry,
        status: ProjectStatus.PLANNING,
        startDate: new Date(dto.startDate),
        estimatedEndDate: dto.estimatedEndDate
          ? new Date(dto.estimatedEndDate)
          : undefined,
        notes: dto.notes,
      });

      const savedProject = await manager.save(project);

      // 7. Crear fases (si se proporcionan)
      if (dto.phases && dto.phases.length > 0) {
        for (const phaseDto of dto.phases) {
          const phase = manager.create(ProjectPhase, {
            projectId: savedProject.id,
            name: phaseDto.name,
            description: phaseDto.description,
            order: phaseDto.order,
            status: PhaseStatus.PENDING,
            estimatedDays: phaseDto.estimatedDays,
          });

          await manager.save(phase);
        }
      }

      // 8. Crear ProjectMaterials desde los items del presupuesto
      for (const item of budget.items || []) {
        const material = manager.create(ProjectMaterial, {
          projectId: savedProject.id,
          productId: item.productId,
          warehouseId: budget.warehouseId,
          productName: item.productName,
          productSku: item.productSku,
          unitPrice: item.unitPrice,
          quantityPlanned: item.quantity,
          quantityDelivered: 0,
          quantityUsed: 0,
          quantityReturned: 0,
          status: ProjectMaterialStatus.PLANNED,
        });

        await manager.save(material);
      }

      // 9. Marcar el presupuesto como convertido
      budget.status = BudgetStatus.CONVERTED;
      budget.convertedProjectId = savedProject.id;
      budget.convertedAt = new Date();
      await manager.save(budget);

      this.logger.log(
        `🏗️ Proyecto creado: ${savedProject.projectNumber} desde presupuesto ${budget.budgetNumber}`,
      );

      // 10. Retornar el proyecto completo
      return manager.findOne(Project, {
        where: { id: savedProject.id },
        relations: ['client', 'projectManager', 'phases', 'materials'],
      });
    });
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(query: QueryProjectDto, tenantId: string) {
    const { page = 1, limit = 20, search, from, to, ...filters } = query;
    const skip = (page - 1) * limit;

    const qb = this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.client', 'client')
      .leftJoinAndSelect('project.projectManager', 'projectManager')
      .leftJoinAndSelect('project.phases', 'phases')
      .where('project.tenantId = :tenantId', { tenantId });

    if (filters.clientId) {
      qb.andWhere('project.clientId = :clientId', { clientId: filters.clientId });
    }

    if (filters.budgetId) {
      qb.andWhere('project.budgetId = :budgetId', { budgetId: filters.budgetId });
    }

    if (filters.projectManagerId) {
      qb.andWhere('project.projectManagerId = :pmId', {
        pmId: filters.projectManagerId,
      });
    }

    if (filters.status) {
      qb.andWhere('project.status = :status', { status: filters.status });
    }

    if (search) {
      qb.andWhere(
        '(project.projectNumber ILIKE :search OR project.title ILIKE :search OR project.siteAddress ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (from && to) {
      qb.andWhere('project.startDate BETWEEN :from AND :to', { from, to });
    }

    qb.orderBy('project.createdAt', 'DESC').skip(skip).take(limit);

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
  async findOne(id: string, tenantId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id, tenantId },
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

    if (!project) {
      throw new NotFoundException(`Proyecto ${id} no encontrado`);
    }

    return project;
  }

  // ============================================
  // READ BY NUMBER
  // ============================================
  async findByNumber(projectNumber: string, tenantId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { projectNumber, tenantId },
      relations: ['client', 'projectManager', 'phases', 'materials'],
    });

    if (!project) {
      throw new NotFoundException(`Proyecto ${projectNumber} no encontrado`);
    }

    return project;
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(
    id: string,
    dto: UpdateProjectDto,
    tenantId: string,
  ): Promise<Project> {
    const project = await this.findOne(id, tenantId);

    if (
      project.status === ProjectStatus.COMPLETED ||
      project.status === ProjectStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `No se puede editar un proyecto en estado ${project.status}`,
      );
    }

    // Convertir fechas
    if (dto.startDate) (dto as any).startDate = new Date(dto.startDate);
    if (dto.estimatedEndDate)
      (dto as any).estimatedEndDate = new Date(dto.estimatedEndDate);

    Object.assign(project, dto);
    return this.projectsRepository.save(project);
  }

  // ============================================
  // START
  // ============================================
  async start(id: string, tenantId: string): Promise<Project> {
    const project = await this.findOne(id, tenantId);

    if (project.status !== ProjectStatus.PLANNING) {
      throw new BadRequestException(
        `Solo se puede iniciar un proyecto en planificación. Estado actual: ${project.status}`,
      );
    }

    project.status = ProjectStatus.IN_PROGRESS;
    project.startedAt = new Date();

    // Si no tenía fecha de inicio, asignar hoy
    if (!project.startDate) {
      project.startDate = new Date();
    }

    this.logger.log(`▶️ Proyecto iniciado: ${project.projectNumber}`);
    return this.projectsRepository.save(project);
  }

  // ============================================
  // PAUSE
  // ============================================
  async pause(id: string, tenantId: string): Promise<Project> {
    const project = await this.findOne(id, tenantId);

    if (project.status !== ProjectStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Solo se puede pausar un proyecto en progreso. Estado actual: ${project.status}`,
      );
    }

    project.status = ProjectStatus.PAUSED;
    project.pausedAt = new Date();
    return this.projectsRepository.save(project);
  }

  // ============================================
  // RESUME
  // ============================================
  async resume(id: string, tenantId: string): Promise<Project> {
    const project = await this.findOne(id, tenantId);

    if (project.status !== ProjectStatus.PAUSED) {
      throw new BadRequestException(
        `Solo se puede resumir un proyecto pausado. Estado actual: ${project.status}`,
      );
    }

    project.status = ProjectStatus.IN_PROGRESS;
    return this.projectsRepository.save(project);
  }

  // ============================================
  // COMPLETE
  // ============================================
  async complete(
    id: string,
    tenantId: string,
    userId?: string,
    closeNotes?: string,
  ): Promise<Project> {
    const project = await this.findOne(id, tenantId);

    if (project.status !== ProjectStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Solo se puede completar un proyecto en progreso. Estado actual: ${project.status}`,
      );
    }

    // Validar que no haya materiales sin devolver
    const pendingMaterials = await this.materialsRepository.count({
      where: [
        { projectId: id, status: ProjectMaterialStatus.DELIVERED },
        { projectId: id, status: ProjectMaterialStatus.PARTIALLY_USED },
      ],
    });

    if (pendingMaterials > 0) {
      throw new BadRequestException(
        `Hay ${pendingMaterials} material(es) sin devolver. Procesa las devoluciones antes de completar.`,
      );
    }

    // Calcular costos reales
    const materialsCost = await this.materialsRepository
      .createQueryBuilder('pm')
      .select('SUM(pm.quantity_used * pm.unit_price)', 'total')
      .where('pm.project_id = :projectId', { projectId: id })
      .getRawOne();

    project.status = ProjectStatus.COMPLETED;
    project.completedAt = new Date();
    project.actualEndDate = new Date();
    project.completedById = userId;
    project.progressPercentage = 100;
    project.closeNotes = closeNotes;
    project.materialsCostActual = parseFloat(materialsCost?.total || 0);

    this.logger.log(`✅ Proyecto completado: ${project.projectNumber}`);
    return this.projectsRepository.save(project);
  }

  // ============================================
  // CANCEL
  // ============================================
  async cancel(
    id: string,
    tenantId: string,
    reason: string,
  ): Promise<Project> {
    const project = await this.findOne(id, tenantId);

    if (
      project.status === ProjectStatus.COMPLETED ||
      project.status === ProjectStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `No se puede cancelar un proyecto en estado ${project.status}`,
      );
    }

    project.status = ProjectStatus.CANCELLED;
    project.cancelledAt = new Date();
    project.closeNotes = reason;

    this.logger.log(`❌ Proyecto cancelado: ${project.projectNumber}`);
    return this.projectsRepository.save(project);
  }

  // ============================================
  // DELETE (solo planning)
  // ============================================
  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const project = await this.findOne(id, tenantId);

    if (project.status !== ProjectStatus.PLANNING) {
      throw new BadRequestException(
        'Solo se pueden eliminar proyectos en planificación',
      );
    }

    await this.projectsRepository.remove(project);
    return { message: 'Proyecto eliminado' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId: string) {
  const total = await this.projectsRepository.count({ where: { tenantId } });

  const byStatus = await this.projectsRepository
    .createQueryBuilder('project')
    .select('project.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .where('project.tenantId = :tenantId', { tenantId })
    .groupBy('project.status')
    .getRawMany();

  const totals = await this.projectsRepository
    .createQueryBuilder('project')
    .select('SUM(project.totalCostActual)', 'totalCost')
    .addSelect('AVG(project.progressPercentage)', 'avgProgress')
    .where('project.tenantId = :tenantId', { tenantId })
    .getRawOne();

  // Obtener proyectos completados y calcular promedio en JS
  const completedProjects = await this.projectsRepository.find({
    where: { tenantId, status: ProjectStatus.COMPLETED },
    select: ['id', 'startDate', 'actualEndDate'],
  });

  let avgDurationDays = 0;
  if (completedProjects.length > 0) {
    const totalDays = completedProjects.reduce((sum, p) => {
      if (p.startDate && p.actualEndDate) {
        const diff = new Date(p.actualEndDate).getTime() - new Date(p.startDate).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }
      return sum;
    }, 0);
    avgDurationDays = totalDays / completedProjects.length;
  }

  return {
    total,
    byStatus,
    totalCostActual: parseFloat(totals?.totalCost || 0),
    avgProgress: parseFloat(totals?.avgProgress || 0),
    avgDurationDays: Math.round(avgDurationDays),
  };
}
}