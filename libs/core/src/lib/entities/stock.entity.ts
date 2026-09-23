// libs/core/src/lib/entities/stock.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Product } from './product.entity';
import { Warehouse } from './warehouse.entity';

@Entity({ name: 'stocks' })
@Unique('UQ_stock_tenant_warehouse_product', [
  'tenantId',
  'warehouseId',
  'productId',
])
export class Stock {
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
  @Column({ name: 'warehouse_id' })
  @Index()
  warehouseId!: string;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: Warehouse;

  @Column({ name: 'product_id' })
  @Index()
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  // ============================================
  // CANTIDADES
  // ============================================
  @Column({ type: 'int', default: 0 })
  @Index()
  quantity!: number;

  @Column({ type: 'int', default: 0, name: 'reserved_quantity' })
  reservedQuantity!: number;

  @Column({ type: 'int', default: 0, name: 'min_stock' })
  @Index()
  minStock!: number;

  @Column({ type: 'int', nullable: true, name: 'max_stock' })
  maxStock?: number;

  // ============================================
  // UBICACIÓN FÍSICA
  // ============================================
  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true, name: 'shelf' })
  shelf?: string;

  @Column({ nullable: true, name: 'bin' })
  bin?: string;

  // ============================================
  // AUDITORÍA
  // ============================================
  @Column({ nullable: true, name: 'last_counted_at', type: 'timestamp' })
  lastCountedAt?: Date;

  @Column({ nullable: true, name: 'last_counted_by' })
  lastCountedBy?: string;

  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}