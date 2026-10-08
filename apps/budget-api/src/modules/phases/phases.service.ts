// apps/budget-api/src/modules/phases/phases.service.ts
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
  PhaseStatus,
} from '@ecommerce/core';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';

@Injectable()
export class PhasesService {
  constructor(
    @InjectRepository(ProjectPhase)
    private readonly phasesRepository: Repository<ProjectPhase>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectTask)
    private readonly tasksRepository: Repository<ProjectTask>,
  ) {}

  // ============================================
  // HELPER: verificar proyecto
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
    dto: CreatePhaseDto,
    tenantId: string,
  ): Promise<ProjectPhase> {
    await this.verifyProject(projectId, tenantId);

    const phase = this.phasesRepository.create({
      ...dto,
      projectId,
      status: PhaseStatus.PENDING,
    });

    return this.phasesRepository.save(phase);
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(projectId: string, tenantId: string) {
    await this.verifyProject(projectId, tenantId);

    return this.phasesRepository.find({
      where: { projectId },
      relations: ['tasks', 'tasks.worker'],
      order: { order: 'ASC' },
    });
  }

  // ============================================
  // READ ONE
  // ============================================
  async findOne(
    id: string,
    projectId: string,
    tenantId: string,
  ): Promise<ProjectPhase> {
    await this.verifyProject(projectId, tenantId);

    const phase = await this.phasesRepository.findOne({
      where: { id, projectId },
      relations: ['tasks', 'tasks.worker'],
    });

    if (!phase) {
      throw new NotFoundException(`Fase ${id} no encontrada`);
    }

    return phase;
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(
    id: string,
    dto: UpdatePhaseDto,
    projectId: string,
    tenantId: string,
  ): Promise<ProjectPhase> {
    const phase = await this.findOne(id, projectId, tenantId);

    if (phase.status === PhaseStatus.COMPLETED) {
      throw new BadRequestException('No se puede editar una fase completada');
    }

    Object.assign(phase, dto);
    return this.phasesRepository.save(phase);
  }

  // ============================================
  // START
  // ============================================
  async start(
    id: string,
    projectId: string,
    tenantId: string,
  ): Promise<ProjectPhase> {
    const phase = await this.findOne(id, projectId, tenantId);

    if (phase.status !== PhaseStatus.PENDING) {
      throw new BadRequestException(
        `Solo se puede iniciar una fase pendiente. Estado actual: ${phase.status}`,
      );
    }

    phase.status = PhaseStatus.IN_PROGRESS;
    phase.startDate = new Date();

    return this.phasesRepository.save(phase);
  }

  // ============================================
  // COMPLETE
  // ============================================
  async complete(
    id: string,
    projectId: string,
    tenantId: string,
  ): Promise<ProjectPhase> {
    const phase = await this.findOne(id, projectId, tenantId);

    if (phase.status !== PhaseStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Solo se puede completar una fase en progreso. Estado actual: ${phase.status}`,
      );
    }

    // Verificar que todas las tareas estén completadas
    const pendingTasks = await this.tasksRepository.count({
      where: {
        phaseId: id,
        status: 'pending' as any,
      },
    });

    if (pendingTasks > 0) {
      throw new BadRequestException(
        `Hay ${pendingTasks} tarea(s) pendiente(s) en esta fase`,
      );
    }

    phase.status = PhaseStatus.COMPLETED;
    phase.actualEndDate = new Date();
    phase.progressPercentage = 100;

    const saved = await this.phasesRepository.save(phase);

    // Actualizar progreso del proyecto
    await this.recalculateProjectProgress(projectId);

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
    const phase = await this.findOne(id, projectId, tenantId);

    const taskCount = await this.tasksRepository.count({
      where: { phaseId: id },
    });

    if (taskCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar una fase con ${taskCount} tarea(s)`,
      );
    }

    await this.phasesRepository.remove(phase);
    return { message: 'Fase eliminada' };
  }

  // ============================================
  // RECALCULAR PROGRESO DEL PROYECTO
  // ============================================
  async recalculateProjectProgress(projectId: string): Promise<void> {
    const phases = await this.phasesRepository.find({
      where: { projectId },
    });

    if (phases.length === 0) return;

    const completed = phases.filter(
      (p) => p.status === PhaseStatus.COMPLETED,
    ).length;

    const progress = (completed / phases.length) * 100;

    await this.projectsRepository.update(projectId, {
      progressPercentage: progress,
      totalTasks: phases.length,
      completedTasks: completed,
    });
  }
}