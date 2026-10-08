// libs/core/src/lib/entities/purchase-order.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Supplier } from './supplier.entity';
import { Warehouse } from './warehouse.entity';
import { User } from './user.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  CONFIRMED = 'confirmed',
  PARTIALLY_RECEIVED = 'partially_received',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'purchase_orders' })
export class PurchaseOrder {
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
  @Column({ name: 'supplier_id' })
  @Index()
  supplierId!: string;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  @Column({ name: 'warehouse_id' })
  @Index()
  warehouseId!: string;

  @ManyToOne(() => Warehouse, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: Warehouse;

  @Column({ name: 'created_by_id', nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, {
    cascade: true,
    eager: true,
  })
  items!: PurchaseOrderItem[];

  // ============================================
  // IDENTIFICACIÓN
  // ============================================
  @Column({ unique: true, name: 'order_number' })
  @Index()
  orderNumber!: string;

  // ============================================
  // ESTADO
  // ============================================
  @Column({
    type: 'enum',
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.DRAFT,
  })
  @Index()
  status!: PurchaseOrderStatus;

  // ============================================
  // FECHAS
  // ============================================
  @Column({ type: 'date', name: 'order_date' })
  orderDate!: Date;

  @Column({ type: 'date', nullable: true, name: 'expected_date' })
  expectedDate?: Date;

  @Column({ type: 'date', nullable: true, name: 'received_date' })
  receivedDate?: Date;

  // ============================================
  // TOTALES
  // ============================================
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  shipping!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total!: number;

  // ============================================
  // COMERCIAL
  // ============================================
  @Column({ default: 'USD' })
  currency!: string;

  @Column({ type: 'int', default: 0, name: 'payment_terms' })
  paymentTerms!: number;

  // ============================================
  // EXTRAS
  // ============================================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ nullable: true, name: 'internal_reference' })
  internalReference?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}