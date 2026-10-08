// apps/budget-api/src/modules/materials/materials.service.ts
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
  ProjectMaterial,
  ProjectMaterialStatus,
  Stock,
  Movement,
  MovementType,
  Worker,
} from '@ecommerce/core';
import { DeliverMaterialDto } from './dto/deliver-material.dto';
import { UseMaterialDto } from './dto/use-material.dto';
import { ReturnMaterialDto } from './dto/return-material.dto';
import { ReportLostDto } from './dto/report-lost.dto';

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    @InjectRepository(ProjectMaterial)
    private readonly materialsRepository: Repository<ProjectMaterial>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Worker)
    private readonly workersRepository: Repository<Worker>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================
  // HELPER
  // ============================================
  private async verifyProject(projectId: string, tenantId: string) {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId, tenantId },
    });

    if (!project) {
      throw new NotFoundException(`Proyecto ${projectId} no encontrado`);
    }

    return project;
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(projectId: string, tenantId: string, status?: string) {
    await this.verifyProject(projectId, tenantId);

    const where: any = { projectId };
    if (status) where.status = status;

    const materials = await this.materialsRepository.find({
      where,
      relations: ['assignedToWorker', 'product'],
      order: { createdAt: 'ASC' },
    });

    // Calcular totales
    const totals = await this.materialsRepository
      .createQueryBuilder('mat')
      .select('SUM(mat.quantity_planned * mat.unit_price)', 'plannedCost')
      .addSelect('SUM(mat.quantity_used * mat.unit_price)', 'usedCost')
      .where('mat.project_id = :projectId', { projectId })
      .getRawOne();

    return {
      data: materials,
      totals: {
        plannedCost: parseFloat(totals?.plannedCost || 0),
        usedCost: parseFloat(totals?.usedCost || 0),
      },
    };
  }

  // ============================================
  // READ ONE
  // ============================================
  async findOne(
    id: string,
    projectId: string,
    tenantId: string,
  ): Promise<ProjectMaterial> {
    await this.verifyProject(projectId, tenantId);

    const material = await this.materialsRepository.findOne({
      where: { id, projectId },
      relations: ['assignedToWorker', 'product', 'warehouse'],
    });

    if (!material) {
      throw new NotFoundException(`Material ${id} no encontrado`);
    }

    return material;
  }

  // ============================================
  // DELIVER (entregar al worker)
  // ============================================
  async deliver(
    id: string,
    dto: DeliverMaterialDto,
    projectId: string,
    tenantId: string,
    userId?: string,
  ): Promise<ProjectMaterial> {
    return this.dataSource.transaction(async (manager) => {
      const material = await manager.findOne(ProjectMaterial, {
        where: { id, projectId },
        relations: ['project'],
      });

      if (!material) {
        throw new NotFoundException(`Material ${id} no encontrado`);
      }

      // Validar estado
      if (material.status !== ProjectMaterialStatus.PLANNED) {
        throw new BadRequestException(
          `Solo se pueden entregar materiales en estado "planned". Actual: ${material.status}`,
        );
      }

      // Validar worker
      const worker = await manager.findOne(Worker, {
        where: { id: dto.workerId, tenantId },
      });

      if (!worker) {
        throw new BadRequestException('Worker no encontrado');
      }

      // 🔥 CONVERTIR A NÚMEROS EXPLÍCITAMENTE
      const delivered = Number(dto.quantityDelivered) || 0;
      const planned = Number(material.quantityPlanned) || 0;

      // Validar que no exceda lo planeado
      if (delivered > planned) {
        throw new BadRequestException(
          `Cantidad entregada (${delivered}) excede lo planeado (${planned})`,
        );
      }

      // Verificar stock disponible
      const stock = await manager.findOne(Stock, {
        where: {
          tenantId,
          warehouseId: material.warehouseId,
          productId: material.productId,
        },
      });

      const stockQty = Number(stock?.quantity) || 0;

      if (!stock || stockQty < delivered) {
        throw new BadRequestException(
          `Stock insuficiente. Disponible: ${stockQty}, solicitado: ${delivered}`,
        );
      }

      // Descontar stock
      const stockBefore = stockQty;
      const stockAfter = stockBefore - delivered;

      stock.quantity = stockAfter;
      await manager.save(stock);

      // Crear movimiento
      const movement = manager.create(Movement, {
        tenantId,
        warehouseId: material.warehouseId,
        productId: material.productId,
        userId,
        type: MovementType.CONSUMPTION,
        quantity: -delivered,
        stockBefore,
        stockAfter,
        referenceType: 'project_material',
        referenceId: material.id,
        reason: `Entrega a ${worker.name} para proyecto ${material.project.projectNumber}`,
      });
      await manager.save(movement);

      // Actualizar material
      material.quantityDelivered = delivered;
      material.assignedToWorkerId = dto.workerId;
      material.deliveredAt = new Date();
      material.status = ProjectMaterialStatus.DELIVERED;

      if (dto.notes) {
        material.notes = `${material.notes || ''}\n[Entrega]: ${dto.notes}`;
      }

      const saved = await manager.save(material);

      this.logger.log(
        `📦 Material entregado: ${delivered} de ${material.productName} a ${worker.name}`,
      );

      return manager.findOne(ProjectMaterial, {
        where: { id: saved.id },
        relations: ['assignedToWorker', 'product', 'warehouse'],
      });
    });
  }

  // ============================================
  // USE (reportar uso)
  // ============================================
  async use(
    id: string,
    dto: UseMaterialDto,
    projectId: string,
    tenantId: string,
  ): Promise<ProjectMaterial> {
    const material = await this.findOne(id, projectId, tenantId);

    if (
      material.status !== ProjectMaterialStatus.DELIVERED &&
      material.status !== ProjectMaterialStatus.PARTIALLY_USED
    ) {
      throw new BadRequestException(
        `Solo se puede reportar uso en materiales entregados. Actual: ${material.status}`,
      );
    }

    // 🔥 CONVERTIR A NÚMEROS EXPLÍCITAMENTE
    const delivered = Number(material.quantityDelivered) || 0;
    const used = Number(dto.quantityUsed) || 0;
    const unitPrice = Number(material.unitPrice) || 0;

    if (used > delivered) {
      throw new BadRequestException(
        `Cantidad usada (${used}) excede la entregada (${delivered})`,
      );
    }

    material.quantityUsed = used;
    material.costActual = used * unitPrice;

    // Si usó todo → consumed
    if (used >= delivered) {
      material.status = ProjectMaterialStatus.CONSUMED;
    } else {
      material.status = ProjectMaterialStatus.PARTIALLY_USED;
    }

    if (dto.notes) {
      material.notes = `${material.notes || ''}\n[Uso]: ${dto.notes}`;
    }

    const saved = await this.materialsRepository.save(material);

    this.logger.log(
      `📊 Uso reportado: ${used}/${delivered} de ${material.productName}`,
    );

    // Actualizar costo de materiales del proyecto
    await this.recalculateProjectMaterialsCost(projectId);

    return this.findOne(saved.id, projectId, tenantId);
  }

  // ============================================
  // RETURN (devolver sobrantes)
  // ============================================
  async returnMaterial(
    id: string,
    dto: ReturnMaterialDto,
    projectId: string,
    tenantId: string,
    userId?: string,
  ): Promise<ProjectMaterial> {
    return this.dataSource.transaction(async (manager) => {
      const material = await manager.findOne(ProjectMaterial, {
        where: { id, projectId },
        relations: ['project'],
      });

      if (!material) {
        throw new NotFoundException(`Material ${id} no encontrado`);
      }

      if (
        material.status !== ProjectMaterialStatus.DELIVERED &&
        material.status !== ProjectMaterialStatus.PARTIALLY_USED
      ) {
        throw new BadRequestException(
          `Solo se pueden devolver materiales entregados o en uso parcial. Actual: ${material.status}`,
        );
      }

      // 🔥 CONVERTIR A NÚMEROS EXPLÍCITAMENTE
      const delivered = Number(material.quantityDelivered) || 0;
      const used = Number(material.quantityUsed) || 0;
      const alreadyReturned = Number(material.quantityReturned) || 0;
      const returned = Number(dto.quantityReturned) || 0;

      // Calcular sobrantes disponibles
      const maxReturnable = delivered - used - alreadyReturned;

      if (returned > maxReturnable) {
        throw new BadRequestException(
          `Cantidad a devolver (${returned}) excede el sobrante disponible (${maxReturnable})`,
        );
      }

      // Devolver stock
      const stock = await manager.findOne(Stock, {
        where: {
          tenantId,
          warehouseId: material.warehouseId,
          productId: material.productId,
        },
      });

      if (stock) {
        const stockBefore = Number(stock.quantity) || 0;
        const stockAfter = stockBefore + returned;

        stock.quantity = stockAfter;
        await manager.save(stock);

        // Crear movimiento de devolución
        const movement = manager.create(Movement, {
          tenantId,
          warehouseId: material.warehouseId,
          productId: material.productId,
          userId,
          type: MovementType.PROJECT_RETURN,
          quantity: returned,
          stockBefore,
          stockAfter,
          referenceType: 'project_material',
          referenceId: material.id,
          reason: `Devolución de sobrante del proyecto ${material.project.projectNumber}`,
        });
        await manager.save(movement);
      }

      // Actualizar material
      material.quantityReturned = alreadyReturned + returned;
      material.returnedAt = new Date();

      // Si ya no quedan materiales sin devolver → returned
      const totalReturned = material.quantityReturned;
      const totalUsed = used;
      const totalDelivered = delivered;

      if (totalUsed + totalReturned >= totalDelivered) {
        material.status = ProjectMaterialStatus.RETURNED;
      }

      if (dto.notes) {
        material.notes = `${material.notes || ''}\n[Devolución]: ${dto.notes}`;
      }

      const saved = await manager.save(material);

      this.logger.log(
        `↩️ Devolución: ${returned} de ${material.productName} al almacén`,
      );

      await this.recalculateProjectMaterialsCost(projectId);

      return manager.findOne(ProjectMaterial, {
        where: { id: saved.id },
        relations: ['assignedToWorker', 'product', 'warehouse'],
      });
    });
  }

  // ============================================
  // REPORT LOST (pérdida/daño)
  // ============================================
  async reportLost(
    id: string,
    dto: ReportLostDto,
    projectId: string,
    tenantId: string,
  ): Promise<ProjectMaterial> {
    const material = await this.findOne(id, projectId, tenantId);

    if (
      material.status !== ProjectMaterialStatus.DELIVERED &&
      material.status !== ProjectMaterialStatus.PARTIALLY_USED
    ) {
      throw new BadRequestException(
        `Solo se puede reportar pérdida en materiales entregados. Actual: ${material.status}`,
      );
    }

    // 🔥 CONVERTIR A NÚMEROS EXPLÍCITAMENTE
    const delivered = Number(material.quantityDelivered) || 0;
    const used = Number(material.quantityUsed) || 0;
    const returned = Number(material.quantityReturned) || 0;
    const lost = Number(dto.quantityLost) || 0;
    const unitPrice = Number(material.unitPrice) || 0;

    const maxReportable = delivered - used - returned;

    if (lost > maxReportable) {
      throw new BadRequestException(
        `Cantidad perdida (${lost}) excede el sobrante disponible (${maxReportable})`,
      );
    }

    // Sumar a quantityUsed (se consumió por pérdida)
    const newUsed = used + lost;
    material.quantityUsed = newUsed;
    material.costActual = newUsed * unitPrice;
    material.status = ProjectMaterialStatus.LOST;

    if (dto.reason) {
      material.notes = `${material.notes || ''}\n[Pérdida]: ${dto.reason}`;
    }

    const saved = await this.materialsRepository.save(material);

    this.logger.warn(
      `⚠️ Pérdida reportada: ${lost} de ${material.productName} - ${dto.reason}`,
    );

    await this.recalculateProjectMaterialsCost(projectId);

    return this.findOne(saved.id, projectId, tenantId);
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(projectId: string, tenantId: string) {
    await this.verifyProject(projectId, tenantId);

    const materials = await this.materialsRepository.find({
      where: { projectId },
    });

    const byStatus = await this.materialsRepository
      .createQueryBuilder('mat')
      .select('mat.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('mat.project_id = :projectId', { projectId })
      .groupBy('mat.status')
      .getRawMany();

    const totals = await this.materialsRepository
      .createQueryBuilder('mat')
      .select('SUM(mat.quantity_planned)', 'plannedQty')
      .addSelect('SUM(mat.quantity_delivered)', 'deliveredQty')
      .addSelect('SUM(mat.quantity_used)', 'usedQty')
      .addSelect('SUM(mat.quantity_returned)', 'returnedQty')
      .addSelect('SUM(mat.quantity_used * mat.unit_price)', 'usedCost')
      .addSelect('SUM(mat.quantity_planned * mat.unit_price)', 'plannedCost')
      .where('mat.project_id = :projectId', { projectId })
      .getRawOne();

    return {
      total: materials.length,
      byStatus,
      quantities: {
        planned: parseFloat(totals?.plannedQty || 0),
        delivered: parseFloat(totals?.deliveredQty || 0),
        used: parseFloat(totals?.usedQty || 0),
        returned: parseFloat(totals?.returnedQty || 0),
      },
      costs: {
        planned: parseFloat(totals?.plannedCost || 0),
        used: parseFloat(totals?.usedCost || 0),
      },
    };
  }

  // ============================================
  // RECALCULAR COSTO DE MATERIALES DEL PROYECTO
  // ============================================
  private async recalculateProjectMaterialsCost(
    projectId: string,
  ): Promise<void> {
    const result = await this.materialsRepository
      .createQueryBuilder('mat')
      .select('SUM(mat.quantity_used * mat.unit_price)', 'total')
      .where('mat.project_id = :projectId', { projectId })
      .getRawOne();

    const materialsCost = parseFloat(result?.total || 0);

    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });

    if (project) {
      project.materialsCostActual = materialsCost;
      project.totalCostActual =
        materialsCost +
        Number(project.laborCostActual) +
        Number(project.additionalCostsActual);

      await this.projectsRepository.save(project);
    }
  }
}