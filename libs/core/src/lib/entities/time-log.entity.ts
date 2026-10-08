// libs/core/src/lib/entities/time-log.entity.ts
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
import { ProjectTask } from './project-task.entity';
import { Worker } from './worker.entity';
import { User } from './user.entity';

export enum TimeLogStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity({ name: 'time_logs' })
export class TimeLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id' })
  @Index()
  projectId!: string;

  @ManyToOne(() => Project, (project) => project.timeLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ name: 'task_id', nullable: true })
  @Index()
  taskId?: string;

  @ManyToOne(() => ProjectTask, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'task_id' })
  task?: ProjectTask;

  @Column({ name: 'worker_id' })
  @Index()
  workerId!: string;

  @ManyToOne(() => Worker, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'worker_id' })
  worker!: Worker;

  // ============================================
  // REGISTRO
  // ============================================
  @Column({ type: 'date' })
  @Index()
  date!: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  hours!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'hourly_rate' })
  hourlyRate!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_cost' })
  totalCost!: number;

  @Column({ type: 'text' })
  description!: string;

  // ============================================
  // ESTADO
  // ============================================
  @Column({
    type: 'enum',
    enum: TimeLogStatus,
    default: TimeLogStatus.PENDING,
  })
  @Index()
  status!: TimeLogStatus;

  // ============================================
  // APROBACIÓN
  // ============================================
  @Column({ name: 'approved_by_id', nullable: true })
  approvedById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy?: User;

  @Column({ type: 'timestamp', nullable: true, name: 'approved_at' })
  approvedAt?: Date;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason?: string;

  // ============================================
  // EXTRAS
  // ============================================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ============================================
  // TIMESTAMPS
  // ============================================
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}