// libs/core/src/lib/entities/price-history.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Material } from './material.entity';
import { Supplier } from './supplier.entity';

@Entity({ name: 'price_history' })
@Index(['materialId', 'purchaseDate'])
export class PriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'material_id' })
  @Index()
  materialId!: string;

  @ManyToOne(() => Material, (m) => m.priceHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'material_id' })
  material?: Material;

  @Column({ name: 'supplier_id', nullable: true })
  @Index()
  supplierId?: string | null;

  @ManyToOne(() => Supplier, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier;

  @Column({ name: 'purchase_order_id', nullable: true })
  purchaseOrderId?: string | null;

  @Column({ name: 'unit_cost', type: 'numeric', precision: 12, scale: 2 })
  unitCost!: number;

  @Column({ type: 'numeric', precision: 12, scale: 3 })
  quantity!: number;

  @Column({ length: 3, default: 'USD' })
  currency!: string;

  @Column({ name: 'purchase_date', type: 'date' })
  @Index()
  purchaseDate!: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}