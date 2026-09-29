// libs/core/src/lib/entities/warranty.entity.ts
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
import { Project } from './project.entity';
import { Invoice } from './invoice.entity';
import { User } from './user.entity';
import { WarrantyClaim } from './warranty-claim.entity';

export enum WarrantyStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CLAIMED = 'claimed',
  VOIDED = 'voided',
  RENEWED = 'renewed',
}

export interface WarrantyCoveredItem {
  productId?: string;
  productName: string;
  productSku?: string;
  serialNumber?: string;
  quantity: number;
  installedAt: Date;
  warrantyMonths: number;
  specificEndDate: Date;
}

@Entity({ name: 'warranties' })
export class Warranty {
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

  @Column({ name: 'invoice_id', nullable: true })
  @Index()
  invoiceId?: string;

  @ManyToOne(() => Invoice, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: Invoice;

  @Column({ name: 'created_by_id', nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;

  // IDENTIFICACIÓN
  @Column({ unique: true, name: 'warranty_number' })
  @Index()
  warrantyNumber!: string;

  // ESTADO
  @Column({
    type: 'enum',
    enum: WarrantyStatus,
    default: WarrantyStatus.ACTIVE,
  })
  @Index()
  status!: WarrantyStatus;

  // FECHAS
  @Column({ type: 'date', name: 'start_date' })
  @Index()
  startDate!: Date;

  @Column({ type: 'date', name: 'end_date' })
  @Index()
  endDate!: Date;

  @Column({ type: 'int', name: 'months_duration' })
  monthsDuration!: number;

  // EQUIPOS CUBIERTOS
  @Column({ type: 'jsonb', default: [] })
  coveredItems!: WarrantyCoveredItem[];

  // TÉRMINOS
  @Column({ type: 'text', nullable: true })
  terms?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ESTADÍSTICAS
  @Column({ type: 'int', default: 0, name: 'claims_count' })
  claimsCount!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'claims_cost',
  })
  claimsCost!: number;

  // RENOVACIÓN
  @Column({ nullable: true, name: 'renewed_from_id' })
  renewedFromId?: string;

  @Column({ nullable: true, name: 'renewed_to_id' })
  renewedToId?: string;

  // EXTRAS
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // RELACIONES
  @OneToMany(() => WarrantyClaim, (claim) => claim.warranty, {
    cascade: true,
  })
  claims!: WarrantyClaim[];

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}