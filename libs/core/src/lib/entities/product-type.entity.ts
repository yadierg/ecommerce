// libs/core/src/lib/entities/product-type.entity.ts
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
import { Material } from './material.entity';
import { AttributeDefinition } from './attribute-definition.entity';

@Entity({ name: 'product_types' })
export class ProductType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', nullable: true })
  @Index()
  tenantId?: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ length: 30 })
  @Index()
  code!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ name: 'name_en', length: 100, nullable: true })
  nameEn?: string;

  @Column({ name: 'category_id', nullable: true })
  @Index()
  categoryId?: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @Column({ length: 50, nullable: true })
  icon?: string;

  @Column({ name: 'is_system', default: false })
  isSystem!: boolean;

  @Column({ name: 'is_active', default: true })
  @Index()
  isActive!: boolean;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @OneToMany(() => Material, (m) => m.productType)
  materials?: Material[];

  @OneToMany(() => AttributeDefinition, (a) => a.productType)
  attributeDefinitions?: AttributeDefinition[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}