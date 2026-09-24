// libs/core/src/lib/entities/worker.entity.ts
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
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity({ name: 'workers' })
export class Worker {
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
  // USUARIO OPCIONAL
  // ============================================
  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // ============================================
  // IDENTIFICACIÓN
  // ============================================
  @Column()
  @Index()
  name!: string;

  @Column({ nullable: true })
  @Index()
  email?: string;

  @Column({ nullable: true })
  @Index()
  phone?: string;

  @Column({ nullable: true, name: 'id_number' })
  idNumber?: string;

  @Column({ nullable: true, type: 'text' })
  address?: string;

  @Column({ nullable: true, name: 'emergency_contact' })
  emergencyContact?: string;

  @Column({ nullable: true, name: 'emergency_phone' })
  emergencyPhone?: string;

  // ============================================
  // ROL Y ESPECIALIDADES
  // ============================================
  @Column()
  @Index()
  role!: string; // electricista, ingeniero, técnico, ayudante, soldador, supervisor

  @Column({ nullable: true })
  position?: string; // "Ingeniero Eléctrico Senior"

  @Column({ type: 'jsonb', default: [] })
  specialties!: string[]; // ['solar', 'battery', 'inverter', 'wiring']

  @Column({ type: 'jsonb', default: [] })
  certifications!: string[]; // ['OSHA-30', 'NABCEP', 'Electrical License']

  @Column({ type: 'int', default: 0, name: 'years_experience' })
  yearsExperience!: number;

  @Column({ type: 'jsonb', default: [] })
  skills!: string[]; // Habilidades específicas

  // ============================================
  // TARIFAS
  // ============================================
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'hourly_rate',
  })
  hourlyRate!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'daily_rate',
  })
  dailyRate?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'monthly_salary',
  })
  monthlySalary?: number;

  @Column({ default: 'USD' })
  currency!: string;

  @Column({ default: 'hourly' })
  paymentType!: string; // hourly, daily, monthly, project

  // ============================================
  // DISPONIBILIDAD
  // ============================================
  @Column({ default: true, name: 'is_available' })
  @Index()
  isAvailable!: boolean;

  @Column({ nullable: true, name: 'current_project_id' })
  @Index()
  currentProjectId?: string;

  @Column({ type: 'int', default: 40, name: 'weekly_hours' })
  weeklyHours!: number;

  // ============================================
  // ESTADO
  // ============================================
  @Column({ default: true, name: 'is_active' })
  @Index()
  isActive!: boolean;

  @Column({ nullable: true, name: 'hire_date', type: 'date' })
  hireDate?: Date;

  @Column({ nullable: true, name: 'termination_date', type: 'date' })
  terminationDate?: Date;

  // ============================================
  // ESTADÍSTICAS (cache)
  // ============================================
  @Column({ type: 'int', default: 0, name: 'total_projects' })
  totalProjects!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'total_hours_logged',
  })
  totalHoursLogged!: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    name: 'rating',
  })
  rating!: number; // 0.00 - 5.00

  // ============================================
  // EXTRAS
  // ============================================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}