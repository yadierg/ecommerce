// apps/budget-api/src/modules/tasks/tasks.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Project,
  ProjectPhase,
  ProjectTask,
  TaskStatus,
  Worker,
  PhaseStatus,
} from '@ecommerce/core';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(ProjectTask)
    private readonly tasksRepository: Repository<ProjectTask>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectPhase)
    private readonly phasesRepository: Repository<ProjectPhase>,
    @InjectRepository(Worker)
    private readonly workersRepository: Repository<Worker>,
  ) {}

  // ============================================
  // HELPERS
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
    dto: CreateTaskDto,
    tenantId: string,
  ): Promise<ProjectTask> {
    await this.verifyProject(projectId, tenantId);

    // Verificar fase si se proporciona
    if (dto.phaseId) {
      const phase = await this.phasesRepository.findOne({
        where: { id: dto.phaseId, projectId },
      });
      if (!phase) {
        throw new BadRequestException('Fase no encontrada en este proyecto');
      }
    }

    // Verificar worker si se proporciona
    if (dto.workerId) {
      const worker = await this.workersRepository.findOne({
        where: { id: dto.workerId, tenantId },
      });
      if (!worker) {
        throw new BadRequestException('Worker no encontrado');
      }
    }

    const task = this.tasksRepository.create({
      ...dto,
      projectId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      status: TaskStatus.PENDING,
    });

    const saved = await this.tasksRepository.save(task);

    // Actualizar contador de tareas
    await this.recalculateTaskCounts(projectId, dto.phaseId);

    return saved;
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(projectId: string, tenantId: string, phaseId?: string) {
    await this.verifyProject(projectId, tenantId);

    const where: any = { projectId };
    if (phaseId) where.phaseId = phaseId;

    return this.tasksRepository.find({
      where,
      relations: ['worker', 'phase'],
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  // ============================================
  // READ ONE
  // ============================================
  async findOne(
    id: string,
    projectId: string,
    tenantId: string,
  ): Promise<ProjectTask> {
    await this.verifyProject(projectId, tenantId);

    const task = await this.tasksRepository.findOne({
      where: { id, projectId },
      relations: ['worker', 'phase'],
    });

    if (!task) {
      throw new NotFoundException(`Tarea ${id} no encontrada`);
    }

    return task;
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(
    id: string,
    dto: UpdateTaskDto,
    projectId: string,
    tenantId: string,
  ): Promise<ProjectTask> {
    const task = await this.findOne(id, projectId, tenantId);

    if (task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('No se puede editar una tarea completada');
    }

    if (dto.workerId) {
      const worker = await this.workersRepository.findOne({
        where: { id: dto.workerId, tenantId },
      });
      if (!worker) {
        throw new BadRequestException('Worker no encontrado');
      }
    }

    if (dto.dueDate) {
      (dto as any).dueDate = new Date(dto.dueDate);
    }

    Object.assign(task, dto);
    return this.tasksRepository.save(task);
  }

  // ============================================
  // ASSIGN
  // ============================================
  async assign(
    id: string,
    workerId: string,
    projectId: string,
    tenantId: string,
  ): Promise<ProjectTask> {
    const task = await this.findOne(id, projectId, tenantId);

    const worker = await this.workersRepository.findOne({
      where: { id: workerId, tenantId },
    });

    if (!worker) {
      throw new BadRequestException('Worker no encontrado');
    }

    task.workerId = workerId;
    return this.tasksRepository.save(task);
  }

  // ============================================
  // START
  // ============================================
  async start(
    id: string,
    projectId: string,
    tenantId: string,
  ): Promise<ProjectTask> {
    const task = await this.findOne(id, projectId, tenantId);

    if (task.status !== TaskStatus.PENDING) {
      throw new BadRequestException(
        `Solo se puede iniciar una tarea pendiente. Estado actual: ${task.status}`,
      );
    }

    if (!task.workerId) {
      throw new BadRequestException('La tarea debe tener un worker asignado');
    }

    task.status = TaskStatus.IN_PROGRESS;
    task.startDate = new Date();

    // Si la fase está pendiente, iniciarla
    if (task.phaseId) {
      const phase = await this.phasesRepository.findOne({
        where: { id: task.phaseId },
      });
      if (phase && phase.status === PhaseStatus.PENDING) {
        phase.status = PhaseStatus.IN_PROGRESS;
        phase.startDate = new Date();
        await this.phasesRepository.save(phase);
      }
    }

    return this.tasksRepository.save(task);
  }

  // ============================================
  // COMPLETE
  // ============================================
  async complete(
    id: string,
    dto: CompleteTaskDto,
    projectId: string,
    tenantId: string,
  ): Promise<ProjectTask> {
    const task = await this.findOne(id, projectId, tenantId);

    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Solo se puede completar una tarea en progreso. Estado actual: ${task.status}`,
      );
    }

    task.status = TaskStatus.COMPLETED;
    task.completedAt = new Date();

    if (dto.actualHours !== undefined) {
      task.actualHours = dto.actualHours;
    }

    if (dto.notes) {
      task.notes = `${task.notes || ''}\n[Completado]: ${dto.notes}`;
    }

    const saved = await this.tasksRepository.save(task);

    // Recalcular contadores
    await this.recalculateTaskCounts(projectId, task.phaseId);

    return saved;
  }

  // ============================================
  // DELETE
  // ============================================
  async remove(
    id: string,
    projectId: string,
    tenantId: string,
  ): Promise<{ message: string }> {
    const task = await this.findOne(id, projectId, tenantId);

    if (task.status === TaskStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'No se puede eliminar una tarea en progreso',
      );
    }

    await this.tasksRepository.remove(task);

    await this.recalculateTaskCounts(projectId, task.phaseId);

    return { message: 'Tarea eliminada' };
  }

  // ============================================
  // RECALCULAR CONTADORES
  // ============================================
  private async recalculateTaskCounts(
    projectId: string,
    phaseId?: string,
  ): Promise<void> {
    // Recalcular fase
    if (phaseId) {
      const tasks = await this.tasksRepository.find({
        where: { phaseId },
      });

      const total = tasks.length;
      const completed = tasks.filter(
        (t) => t.status === TaskStatus.COMPLETED,
      ).length;
      const progress = total > 0 ? (completed / total) * 100 : 0;

      await this.phasesRepository.update(phaseId, {
        totalTasks: total,
        completedTasks: completed,
        progressPercentage: progress,
      });
    }

    // Recalcular proyecto
    const projectTasks = await this.tasksRepository.find({
      where: { projectId },
    });

    const total = projectTasks.length;
    const completed = projectTasks.filter(
      (t) => t.status === TaskStatus.COMPLETED,
    ).length;
    const progress = total > 0 ? (completed / total) * 100 : 0;

    await this.projectsRepository.update(projectId, {
      totalTasks: total,
      completedTasks: completed,
      progressPercentage: progress,
    });
  }
}