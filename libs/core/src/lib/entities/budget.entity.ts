// libs/core/src/lib/entities/budget.entity.ts
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
import { Warehouse } from './warehouse.entity';
import { User } from './user.entity';
import { BudgetItem } from './budget-item.entity';
import { BudgetLaborItem } from './budget-labor-item.entity';

export enum BudgetStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CONVERTED = 'converted',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'budgets' })
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // MULTI-TENANT
  @Column({ name: 'tenant_id' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  // CLIENTE
  @Column({ name: 'client_id' })
  @Index()
  clientId!: string;

  @ManyToOne(() => Client, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'client_id' })
  client!: Client;

  // ALMACÉN DE ORIGEN
  @Column({ name: 'warehouse_id' })
  @Index()
  warehouseId!: string;

  @ManyToOne(() => Warehouse, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: Warehouse;

  // USUARIOS
  @Column({ name: 'created_by_id', nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;

  @Column({ name: 'approved_by_id', nullable: true })
  approvedById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy?: User;

  // IDENTIFICACIÓN
  @Column({ unique: true, name: 'budget_number' })
  @Index()
  budgetNumber!: string;

  @Column({ name: 'project_title' })
  @Index()
  projectTitle!: string;

  @Column({ name: 'project_description', type: 'text', nullable: true })
  projectDescription?: string;

  // UBICACIÓN DE LA OBRA
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

  // ESTADO
  @Column({
    type: 'enum',
    enum: BudgetStatus,
    default: BudgetStatus.DRAFT,
  })
  @Index()
  status!: BudgetStatus;

  // FECHAS
  @Column({ type: 'date', name: 'issue_date' })
  issueDate!: Date;

  @Column({ type: 'date', name: 'valid_until' })
  @Index()
  validUntil!: Date;

  @Column({ type: 'date', nullable: true, name: 'estimated_start_date' })
  estimatedStartDate?: Date;

  @Column({ type: 'int', nullable: true, name: 'estimated_duration_days' })
  estimatedDurationDays?: number;

  @Column({ type: 'timestamp', nullable: true, name: 'sent_at' })
  sentAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'approved_at' })
  approvedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'rejected_at' })
  rejectedAt?: Date;

  // TOTALES
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'materials_subtotal' })
  materialsSubtotal!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'labor_subtotal' })
  laborSubtotal!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'additional_costs' })
  additionalCosts!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total!: number;

  // COMERCIAL
  @Column({ default: 'USD' })
  currency!: string;

  @Column({ type: 'int', default: 0, name: 'payment_terms' })
  paymentTerms!: number;

  @Column({ type: 'int', default: 12, name: 'warranty_months' })
  warrantyMonths!: number;

  // CONVERSIÓN
  @Column({ nullable: true, name: 'converted_project_id' })
  @Index()
  convertedProjectId?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'converted_at' })
  convertedAt?: Date;

  // EXTRAS
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true, name: 'terms_and_conditions' })
  termsAndConditions?: string;

  @Column({ nullable: true, name: 'internal_reference' })
  internalReference?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // RELACIONES
  @OneToMany(() => BudgetItem, (item) => item.budget, {
    cascade: true,
    eager: true,
  })
  items!: BudgetItem[];

  @OneToMany(() => BudgetLaborItem, (item) => item.budget, {
    cascade: true,
    eager: true,
  })
  laborItems!: BudgetLaborItem[];

  // TIMESTAMPS
  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}