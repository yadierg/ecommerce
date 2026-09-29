// libs/core/src/lib/entities/project-task.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from './project.entity';
import { ProjectPhase } from './project-phase.entity';
import { Worker } from './worker.entity';

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity({ name: 'project_tasks' })
export class ProjectTask {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id' })
  @Index()
  projectId!: string;

  @ManyToOne(() => Project, (project) => project.tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ name: 'phase_id', nullable: true })
  @Index()
  phaseId?: string;

  @ManyToOne(() => ProjectPhase, (phase) => phase.tasks, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'phase_id' })
  phase?: ProjectPhase;

  // ============================================
  // ASIGNACIÓN
  // ============================================
  @Column({ name: 'worker_id', nullable: true })
  @Index()
  workerId?: string;

  @ManyToOne(() => Worker, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'worker_id' })
  worker?: Worker;

  // ============================================
  // IDENTIFICACIÓN
  // ============================================
  @Column()
  @Index()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', default: 0 })
  order!: number;

  // ============================================
  // ESTADO
  // ============================================
  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  @Index()
  status!: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.NORMAL,
  })
  @Index()
  priority!: TaskPriority;

  // ============================================
  // HORAS
  // ============================================
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'estimated_hours' })
  estimatedHours!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'actual_hours' })
  actualHours!: number;

  // ============================================
  // FECHAS
  // ============================================
  @Column({ type: 'date', nullable: true, name: 'start_date' })
  startDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'due_date' })
  @Index()
  dueDate?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt?: Date;

  // ============================================
  // EXTRAS
  // ============================================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // ============================================
  // TIMESTAMPS
  // ============================================
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}