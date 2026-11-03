// libs/core/src/lib/entities/material.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Category } from './category.entity';
import { ProductType } from './product-type.entity';
import { UnitOfMeasure } from './unit-of-measure.entity';
import { Supplier } from './supplier.entity';
import { ProductAttribute } from './product-attribute.entity';
import { PriceHistory } from './price-history.entity';

@Entity({ name: 'materials' })
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ length: 50 })
  @Index()
  sku!: string;

  @Column({ length: 200 })
  @Index()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'category_id', nullable: true })
  @Index()
  categoryId?: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @Column({ name: 'product_type_id', nullable: true })
  @Index()
  productTypeId?: string | null;

  @ManyToOne(() => ProductType, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'product_type_id' })
  productType?: ProductType;

  @Column({ name: 'unit_of_measure_id' })
  @Index()
  unitOfMeasureId!: string;

  @ManyToOne(() => UnitOfMeasure, { eager: true })
  @JoinColumn({ name: 'unit_of_measure_id' })
  unitOfMeasure?: UnitOfMeasure;

  @Column({ name: 'unit_cost', type: 'numeric', precision: 12, scale: 2, default: 0 })
  unitCost!: number;

  @Column({ name: 'last_purchase_cost', type: 'numeric', precision: 12, scale: 2, nullable: true })
  lastPurchaseCost?: number | null;

  @Column({ name: 'average_cost', type: 'numeric', precision: 12, scale: 2, default: 0 })
  averageCost!: number;

  @Column({ name: 'min_stock', type: 'int', default: 0 })
  minStock!: number;

  @Column({ name: 'max_stock', type: 'int', nullable: true })
  maxStock?: number | null;

  @Column({ name: 'reorder_point', type: 'int', default: 0 })
  reorderPoint!: number;

  @Column({ name: 'is_active', default: true })
  @Index()
  isActive!: boolean;

  @Column({ name: 'is_purchasable', default: true })
  isPurchasable!: boolean;

  @Column({ name: 'is_consumable', default: true })
  isConsumable!: boolean;

  @Column({ length: 100, nullable: true })
  brand?: string;

  @Column({ name: 'supplier_id', nullable: true })
  @Index()
  supplierId?: string | null;

  @ManyToOne(() => Supplier, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier;

  @Column({ length: 500, nullable: true })
  image?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @OneToMany(() => ProductAttribute, (pa) => pa.material)
  attributes?: ProductAttribute[];

  @OneToMany(() => PriceHistory, (ph) => ph.material)
  priceHistory?: PriceHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}