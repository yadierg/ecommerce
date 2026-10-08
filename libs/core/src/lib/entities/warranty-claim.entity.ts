// libs/core/src/lib/entities/warranty-claim.entity.ts
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
import { Warranty } from './warranty.entity';
import { Tenant } from './tenant.entity';
import { Worker } from './worker.entity';
import { User } from './user.entity';

export enum ClaimStatus {
  OPEN = 'open',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
}

export enum ClaimPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface ClaimAffectedItem {
  productId?: string;
  productName: string;
  serialNumber?: string;
  quantity: number;
  issue: string;
}

@Entity({ name: 'warranty_claims' })
export class WarrantyClaim {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // MULTI-TENANT
  @Column({ name: 'tenant_id' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  // RELACIONES
  @Column({ name: 'warranty_id' })
  @Index()
  warrantyId!: string;

  @ManyToOne(() => Warranty, (warranty) => warranty.claims, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'warranty_id' })
  warranty!: Warranty;

  @Column({ name: 'assigned_to_id', nullable: true })
  @Index()
  assignedToId?: string;

  @ManyToOne(() => Worker, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: Worker;

  @Column({ name: 'created_by_id', nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;

  @Column({ name: 'resolved_by_id', nullable: true })
  resolvedById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resolved_by_id' })
  resolvedBy?: User;

  // IDENTIFICACIÓN
  @Column({ unique: true, name: 'claim_number' })
  @Index()
  claimNumber!: string;

  // ESTADO
  @Column({
    type: 'enum',
    enum: ClaimStatus,
    default: ClaimStatus.OPEN,
  })
  @Index()
  status!: ClaimStatus;

  @Column({
    type: 'enum',
    enum: ClaimPriority,
    default: ClaimPriority.NORMAL,
  })
  @Index()
  priority!: ClaimPriority;

  // FECHAS
  @Column({ type: 'date', name: 'issue_date' })
  @Index()
  issueDate!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'resolved_at' })
  resolvedAt?: Date;

  // DESCRIPCIÓN
  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'jsonb', default: [] })
  affectedItems!: ClaimAffectedItem[];

  @Column({ type: 'text', nullable: true })
  customerNotes?: string;

  // RESOLUCIÓN
  @Column({ type: 'text', nullable: true })
  resolution?: string;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason?: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'covered_cost',
  })
  coveredCost!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'customer_cost',
  })
  customerCost!: number;

  // EXTRAS
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // TIMESTAMPS
  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}