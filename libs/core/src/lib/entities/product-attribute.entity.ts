// libs/core/src/lib/entities/product-attribute.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Material } from './material.entity';
import { Product } from './product.entity';
import { AttributeDefinition, AttributeDataType } from './attribute-definition.entity';

@Entity({ name: 'product_attributes' })
@Index(['materialId', 'attributeKey'], { unique: true })
@Index(['productId', 'attributeKey'], { unique: true })
export class ProductAttribute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'material_id', nullable: true })
  @Index()
  materialId?: string | null;

  @ManyToOne(() => Material, (m) => m.attributes, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'material_id' })
  material?: Material;

  @Column({ name: 'product_id', nullable: true })
  @Index()
  productId?: string | null;

  @ManyToOne(() => Product, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Column({ name: 'attribute_definition_id', nullable: true })
  attributeDefinitionId?: string | null;

  @ManyToOne(() => AttributeDefinition, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'attribute_definition_id' })
  definition?: AttributeDefinition;

  @Column({ name: 'attribute_key', length: 50 })
  @Index()
  attributeKey!: string;

  @Column({ name: 'attribute_label', length: 100 })
  attributeLabel!: string;

  @Column({ name: 'attribute_value', type: 'text' })
  attributeValue!: string;

  @Column({ name: 'attribute_type', type: 'enum', enum: AttributeDataType, default: AttributeDataType.STRING })
  attributeType!: AttributeDataType;

  @Column({ length: 20, nullable: true })
  unit?: string;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}