// apps/budget-api/src/modules/timelogs/timelogs.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Project,
  ProjectTask,
  TimeLog,
  TimeLogStatus,
  Worker,
} from '@ecommerce/core';
import { CreateTimeLogDto } from './dto/create-time-log.dto';
import { UpdateTimeLogDto } from './dto/update-time-log.dto';
import { QueryTimeLogDto } from './dto/query-time-log.dto';

@Injectable()
export class TimeLogsService {
  private readonly logger = new Logger(TimeLogsService.name);

  constructor(
    @InjectRepository(TimeLog)
    private readonly timeLogsRepository: Repository<TimeLog>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectTask)
    private readonly tasksRepository: Repository<ProjectTask>,
    @InjectRepository(Worker)
    private readonly workersRepository: Repository<Worker>,
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
  // CREATE
  // ============================================
  async create(
    projectId: string,
    dto: CreateTimeLogDto,
    tenantId: string,
  ): Promise<TimeLog> {
    await this.verifyProject(projectId, tenantId);

    const worker = await this.workersRepository.findOne({
      where: { id: dto.workerId, tenantId },
    });

    if (!worker) {
      throw new BadRequestException('Worker no encontrado');
    }

    if (dto.taskId) {
      const task = await this.tasksRepository.findOne({
        where: { id: dto.taskId, projectId },
      });
      if (!task) {
        throw new BadRequestException('Tarea no encontrada en este proyecto');
      }
    }

    const hourlyRate = worker.hourlyRate;
    const totalCost = dto.hours * hourlyRate;

    const timeLog = this.timeLogsRepository.create({
      projectId,
      workerId: dto.workerId,
      taskId: dto.taskId,
      date: new Date(dto.date),
      hours: dto.hours,
      hourlyRate,
      totalCost,
      description: dto.description,
      notes: dto.notes,
      status: TimeLogStatus.PENDING,
    });

    const saved = await this.timeLogsRepository.save(timeLog);

    if (dto.taskId) {
      await this.updateTaskActualHours(dto.taskId);
    }

    this.logger.log(`⏱️ TimeLog: ${dto.hours}h para ${worker.name}`);

    return this.timeLogsRepository.findOne({
      where: { id: saved.id },
      relations: ['worker', 'task'],
    });
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(
    projectId: string,
    query: QueryTimeLogDto,
    tenantId: string,
  ) {
    await this.verifyProject(projectId, tenantId);

    const { page = 1, limit = 20, workerId, taskId, status, from, to } = query;
    const skip = (page - 1) * limit;

    const qb = this.timeLogsRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.worker', 'worker')
      .leftJoinAndSelect('log.task', 'task')
      .where('log.projectId = :projectId', { projectId });

    if (workerId) qb.andWhere('log.workerId = :workerId', { workerId });
    if (taskId) qb.andWhere('log.taskId = :taskId', { taskId });
    if (status) qb.andWhere('log.status = :status', { status });

    if (from && to) {
      qb.andWhere('log.date BETWEEN :from AND :to', { from, to });
    }

    qb.orderBy('log.date', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    const totals = await this.timeLogsRepository
      .createQueryBuilder('log')
      .select('SUM(log.hours)', 'totalHours')
      .addSelect('SUM(log.totalCost)', 'totalCost')
      .where('log.projectId = :projectId', { projectId })
      .getRawOne();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalHours: parseFloat(totals?.totalHours || 0),
        totalCost: parseFloat(totals?.totalCost || 0),
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
  ): Promise<TimeLog> {
    await this.verifyProject(projectId, tenantId);

    const log = await this.timeLogsRepository.findOne({
      where: { id, projectId },
      relations: ['worker', 'task', 'approvedBy'],
    });

    if (!log) {
      throw new NotFoundException(`TimeLog ${id} no encontrado`);
    }

    return log;
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(
    id: string,
    dto: UpdateTimeLogDto,
    projectId: string,
    tenantId: string,
  ): Promise<TimeLog> {
    const log = await this.findOne(id, projectId, tenantId);

    if (log.status !== TimeLogStatus.PENDING) {
      throw new BadRequestException(
        'Solo se pueden editar registros pendientes',
      );
    }

    if (dto.date) (dto as any).date = new Date(dto.date);

    if (dto.hours !== undefined) {
      (dto as any).totalCost = dto.hours * log.hourlyRate;
    }

    Object.assign(log, dto);
    const saved = await this.timeLogsRepository.save(log);

    if (log.taskId) {
      await this.updateTaskActualHours(log.taskId);
    }

    return this.timeLogsRepository.findOne({
      where: { id: saved.id },
      relations: ['worker', 'task'],
    });
  }

  // ============================================
  // APPROVE
  // ============================================
  async approve(
    id: string,
    projectId: string,
    tenantId: string,
    userId: string,
  ): Promise<TimeLog> {
    const log = await this.findOne(id, projectId, tenantId);

    if (log.status !== TimeLogStatus.PENDING) {
      throw new BadRequestException(
        `Solo se pueden aprobar registros pendientes. Estado: ${log.status}`,
      );
    }

    log.status = TimeLogStatus.APPROVED;
    log.approvedById = userId;
    log.approvedAt = new Date();

    await this.timeLogsRepository.save(log);

    if (log.taskId) {
      await this.updateTaskActualHours(log.taskId);
    }

    await this.recalculateProjectLaborCost(projectId);

    this.logger.log(`✅ TimeLog aprobado: ${log.hours}h`);

    return this.timeLogsRepository.findOne({
      where: { id },
      relations: ['worker', 'task', 'approvedBy'],
    });
  }

  // ============================================
  // REJECT
  // ============================================
  async reject(
    id: string,
    reason: string,
    projectId: string,
    tenantId: string,
    userId: string,
  ): Promise<TimeLog> {
    const log = await this.findOne(id, projectId, tenantId);

    if (log.status !== TimeLogStatus.PENDING) {
      throw new BadRequestException(
        `Solo se pueden rechazar registros pendientes. Estado: ${log.status}`,
      );
    }

    log.status = TimeLogStatus.REJECTED;
    log.approvedById = userId;
    log.approvedAt = new Date();
    log.rejectionReason = reason;

    await this.timeLogsRepository.save(log);

    if (log.taskId) {
      await this.updateTaskActualHours(log.taskId);
    }

    this.logger.log(`❌ TimeLog rechazado: ${log.hours}h - ${reason}`);

    return this.timeLogsRepository.findOne({
      where: { id },
      relations: ['worker', 'task', 'approvedBy'],
    });
  }

  // ============================================
  // DELETE
  // ============================================
  async remove(
    id: string,
    projectId: string,
    tenantId: string,
  ): Promise<{ message: string }> {
    const log = await this.findOne(id, projectId, tenantId);

    if (log.status === TimeLogStatus.APPROVED) {
      throw new BadRequestException(
        'No se puede eliminar un registro aprobado',
      );
    }

    const taskId = log.taskId;
    await this.timeLogsRepository.remove(log);

    if (taskId) {
      await this.updateTaskActualHours(taskId);
    }

    return { message: 'Registro eliminado' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(projectId: string, tenantId: string) {
    await this.verifyProject(projectId, tenantId);

    const totals = await this.timeLogsRepository
      .createQueryBuilder('log')
      .select('SUM(log.hours)', 'totalHours')
      .addSelect('SUM(log.totalCost)', 'totalCost')
      .addSelect('COUNT(*)', 'totalLogs')
      .where('log.projectId = :projectId', { projectId })
      .getRawOne();

    const byStatus = await this.timeLogsRepository
      .createQueryBuilder('log')
      .select('log.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(log.hours)', 'hours')
      .addSelect('SUM(log.totalCost)', 'cost')
      .where('log.projectId = :projectId', { projectId })
      .groupBy('log.status')
      .getRawMany();

    const byWorker = await this.timeLogsRepository
      .createQueryBuilder('log')
      .leftJoin('log.worker', 'worker')
      .select('worker.id', 'workerId')
      .addSelect('worker.name', 'workerName')
      .addSelect('SUM(log.hours)', 'hours')
      .addSelect('SUM(log.totalCost)', 'cost')
      .where('log.projectId = :projectId', { projectId })
      .andWhere('log.status = :status', { status: TimeLogStatus.APPROVED })
      .groupBy('worker.id')
      .addGroupBy('worker.name')
      .getRawMany();

    return {
      totalLogs: parseInt(totals?.totalLogs || '0', 10),
      totalHours: parseFloat(totals?.totalHours || 0),
      totalCost: parseFloat(totals?.totalCost || 0),
      byStatus,
      byWorker,
    };
  }

  // ============================================
  // HELPERS
  // ============================================
  private async updateTaskActualHours(taskId: string): Promise<void> {
    const result = await this.timeLogsRepository
      .createQueryBuilder('log')
      .select('SUM(log.hours)', 'total')
      .where('log.taskId = :taskId', { taskId })
      .andWhere('log.status = :status', { status: TimeLogStatus.APPROVED })
      .getRawOne();

    const totalHours = parseFloat(result?.total || 0);

    await this.tasksRepository.update(taskId, {
      actualHours: totalHours,
    });
  }

  private async recalculateProjectLaborCost(projectId: string): Promise<void> {
    const result = await this.timeLogsRepository
      .createQueryBuilder('log')
      .select('SUM(log.totalCost)', 'total')
      .where('log.projectId = :projectId', { projectId })
      .andWhere('log.status = :status', { status: TimeLogStatus.APPROVED })
      .getRawOne();

    const laborCost = parseFloat(result?.total || 0);

    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });

    if (project) {
      project.laborCostActual = laborCost;
      project.totalCostActual =
        Number(project.materialsCostActual) +
        laborCost +
        Number(project.additionalCostsActual);

      await this.projectsRepository.save(project);
    }
  }
}