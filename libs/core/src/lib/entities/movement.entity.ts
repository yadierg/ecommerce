// libs/core/src/lib/entities/movement.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Product } from './product.entity';
import { Warehouse } from './warehouse.entity';
import { User } from './user.entity';

export enum MovementType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  ADJUSTMENT = 'adjustment',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  RETURN_IN = 'return_in',
  RETURN_OUT = 'return_out',
  DAMAGE = 'damage',
  LOSS = 'loss',
  INITIAL = 'initial',
}

@Entity({ name: 'movements' })
export class Movement {
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

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // ============================================
  // TIPO Y CANTIDAD
  // ============================================
  @Column({ type: 'enum', enum: MovementType })
  @Index()
  type!: MovementType;

  @Column({ type: 'int' })
  quantity!: number; // + entrada, - salida

  @Column({ type: 'int', name: 'stock_before' })
  stockBefore!: number;

  @Column({ type: 'int', name: 'stock_after' })
  stockAfter!: number;

  // ============================================
  // REFERENCIA
  // ============================================
  @Column({ nullable: true, name: 'reference_type' })
  @Index()
  referenceType?: string; // order, purchase_order, transfer

  @Column({ nullable: true, name: 'reference_id' })
  @Index()
  referenceId?: string;

  // ============================================
  // DESCRIPCIÓN
  // ============================================
  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;
}