// libs/core/src/lib/entities/invoice.entity.ts
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
import { Client } from './client.entity';
import { Project } from './project.entity';
import { Budget } from './budget.entity';
import { User } from './user.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum InvoicePaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
  CHECK = 'check',
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  OTHER = 'other',
}

@Entity({ name: 'invoices' })
export class Invoice {
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
  // RELACIONES
  // ============================================
  @Column({ name: 'project_id' })
  @Index()
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ name: 'client_id' })
  @Index()
  clientId!: string;

  @ManyToOne(() => Client, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'client_id' })
  client!: Client;

  @Column({ name: 'budget_id', nullable: true })
  @Index()
  budgetId?: string;

  @ManyToOne(() => Budget, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'budget_id' })
  budget?: Budget;

  @Column({ name: 'created_by_id', nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;

  // ============================================
  // IDENTIFICACIÓN
  // ============================================
  @Column({ unique: true, name: 'invoice_number' })
  @Index()
  invoiceNumber!: string;

  // ============================================
  // ESTADO
  // ============================================
  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  @Index()
  status!: InvoiceStatus;

  // ============================================
  // FECHAS
  // ============================================
  @Column({ type: 'date', name: 'issue_date' })
  @Index()
  issueDate!: Date;

  @Column({ type: 'date', name: 'due_date' })
  @Index()
  dueDate!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'sent_at' })
  sentAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'paid_at' })
  paidAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'cancelled_at' })
  cancelledAt?: Date;

  // ============================================
  // COSTOS REALES
  // ============================================
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'materials_cost',
  })
  materialsCost!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'labor_cost',
  })
  laborCost!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'additional_costs',
  })
  additionalCosts!: number;

  // ============================================
  // TOTALES
  // ============================================
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total!: number;

  // ============================================
  // COMPARACIÓN CON PRESUPUESTO
  // ============================================
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'budget_total',
  })
  budgetTotal!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'variance',
  })
  variance!: number; // total - budgetTotal

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    name: 'variance_percentage',
  })
  variancePercentage!: number;

  // ============================================
  // COMERCIAL
  // ============================================
  @Column({ default: 'USD' })
  currency!: string;

  @Column({
    type: 'enum',
    enum: InvoicePaymentMethod,
    nullable: true,
    name: 'payment_method',
  })
  paymentMethod?: InvoicePaymentMethod;

  @Column({ nullable: true, name: 'payment_reference' })
  paymentReference?: string;

  @Column({ type: 'int', default: 0, name: 'payment_terms' })
  paymentTerms!: number;

  // ============================================
  // EXTRAS
  // ============================================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true, name: 'terms_and_conditions' })
  termsAndConditions?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // ============================================
  // TIMESTAMPS
  // ============================================
  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}