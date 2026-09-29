// libs/core/src/lib/entities/project-phase.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from './project.entity';
import { ProjectTask } from './project-task.entity';

export enum PhaseStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'project_phases' })
export class ProjectPhase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id' })
  @Index()
  projectId!: string;

  @ManyToOne(() => Project, (project) => project.phases, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  // ============================================
  // IDENTIFICACIÓN
  // ============================================
  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', default: 0 })
  @Index()
  order!: number;

  // ============================================
  // ESTADO
  // ============================================
  @Column({
    type: 'enum',
    enum: PhaseStatus,
    default: PhaseStatus.PENDING,
  })
  @Index()
  status!: PhaseStatus;

  // ============================================
  // FECHAS
  // ============================================
  @Column({ type: 'date', nullable: true, name: 'start_date' })
  startDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'estimated_end_date' })
  estimatedEndDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'actual_end_date' })
  actualEndDate?: Date;

  @Column({ type: 'int', nullable: true, name: 'estimated_days' })
  estimatedDays?: number;

  // ============================================
  // PROGRESO
  // ============================================
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'progress_percentage' })
  progressPercentage!: number;

  @Column({ type: 'int', default: 0, name: 'total_tasks' })
  totalTasks!: number;

  @Column({ type: 'int', default: 0, name: 'completed_tasks' })
  completedTasks!: number;

  // ============================================
  // EXTRAS
  // ============================================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ============================================
  // RELACIONES
  // ============================================
  @OneToMany(() => ProjectTask, (task) => task.phase, {
    cascade: true,
    eager: true,
  })
  tasks!: ProjectTask[];

  // ============================================
  // TIMESTAMPS
  // ============================================
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}