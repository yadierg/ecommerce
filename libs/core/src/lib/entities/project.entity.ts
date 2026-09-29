// libs/core/src/lib/entities/project.entity.ts
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
import { Tenant } from './tenant.entity';
import { Client } from './client.entity';
import { Worker } from './worker.entity';
import { User } from './user.entity';
import { Budget } from './budget.entity';
import { ProjectPhase } from './project-phase.entity';
import { ProjectTask } from './project-task.entity';
import { ProjectMaterial } from './project-material.entity';
import { TimeLog } from './time-log.entity';

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'projects' })
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ============================================
  // MULTI-TENANT
  // ============================================
  @Column({ name: 'tenant_id' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  // ============================================
  // ORÍGENES
  // ============================================
  @Column({ name: 'budget_id', nullable: true })
  @Index()
  budgetId?: string;

  @ManyToOne(() => Budget, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'budget_id' })
  budget?: Budget;

  @Column({ name: 'client_id' })
  @Index()
  clientId!: string;

  @ManyToOne(() => Client, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'client_id' })
  client!: Client;

  @Column({ name: 'warehouse_id' })
  @Index()
  warehouseId!: string;

  // ============================================
  // RESPONSABLES
  // ============================================
  @Column({ name: 'project_manager_id', nullable: true })
  @Index()
  projectManagerId?: string;

  @ManyToOne(() => Worker, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'project_manager_id' })
  projectManager?: Worker;

  @Column({ name: 'created_by_id', nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;

  @Column({ name: 'completed_by_id', nullable: true })
  completedById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'completed_by_id' })
  completedBy?: User;

  // ============================================
  // IDENTIFICACIÓN
  // ============================================
  @Column({ unique: true, name: 'project_number' })
  @Index()
  projectNumber!: string;

  @Column({ name: 'title' })
  @Index()
  title!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  // ============================================
  // UBICACIÓN
  // ============================================
  @Column({ name: 'site_address', type: 'text' })
  siteAddress!: string;

  @Column({ name: 'site_city', nullable: true })
  siteCity?: string;

  @Column({ name: 'site_state', nullable: true })
  siteState?: string;

  @Column({ name: 'site_country', nullable: true })
  siteCountry?: string;

  @Column({ name: 'site_coordinates', type: 'jsonb', nullable: true })
  siteCoordinates?: { lat: number; lng: number };

  // ============================================
  // ESTADO
  // ============================================
  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING,
  })
  @Index()
  status!: ProjectStatus;

  // ============================================
  // FECHAS
  // ============================================
  @Column({ type: 'date', name: 'start_date', nullable: true })
  startDate?: Date;

  @Column({ type: 'date', name: 'estimated_end_date', nullable: true })
  estimatedEndDate?: Date;

  @Column({ type: 'date', name: 'actual_end_date', nullable: true })
  actualEndDate?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'paused_at' })
  pausedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'cancelled_at' })
  cancelledAt?: Date;

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
  // COSTOS REALES (vs presupuesto)
  // ============================================
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'materials_cost_actual',
  })
  materialsCostActual!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'labor_cost_actual',
  })
  laborCostActual!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'additional_costs_actual',
  })
  additionalCostsActual!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'total_cost_actual',
  })
  totalCostActual!: number;

  // ============================================
  // EXTRAS
  // ============================================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true, name: 'close_notes' })
  closeNotes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // ============================================
  // RELACIONES
  // ============================================
  @OneToMany(() => ProjectPhase, (phase) => phase.project, {
    cascade: true,
    eager: true,
  })
  phases!: ProjectPhase[];

  @OneToMany(() => ProjectTask, (task) => task.project)
  tasks!: ProjectTask[];

  @OneToMany(() => ProjectMaterial, (mat) => mat.project)
  materials!: ProjectMaterial[];

  @OneToMany(() => TimeLog, (log) => log.project)
  timeLogs!: TimeLog[];

  // ============================================
  // TIMESTAMPS
  // ============================================
  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}