// libs/core/src/lib/entities/attribute-definition.entity.ts
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
import { ProductType } from './product-type.entity';
import { ProductAttribute } from './product-attribute.entity';

export enum AttributeDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  ENUM = 'enum',
}

@Entity({ name: 'attribute_definitions' })
export class AttributeDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', nullable: true })
  @Index()
  tenantId?: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'product_type_id', nullable: true })
  @Index()
  productTypeId?: string | null;

  @ManyToOne(() => ProductType, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'product_type_id' })
  productType?: ProductType;

  @Column({ length: 50 })
  @Index()
  key!: string;

  @Column({ length: 100 })
  label!: string;

  @Column({ name: 'label_en', length: 100, nullable: true })
  labelEn?: string;

  @Column({ name: 'data_type', type: 'enum', enum: AttributeDataType, default: AttributeDataType.STRING })
  dataType!: AttributeDataType;

  @Column({ length: 20, nullable: true })
  unit?: string;

  @Column({ name: 'enum_values', type: 'jsonb', nullable: true })
  enumValues?: string[] | null;

  @Column({ name: 'is_required', default: false })
  isRequired!: boolean;

  @Column({ name: 'is_searchable', default: true })
  isSearchable!: boolean;

  @Column({ name: 'is_filterable', default: true })
  isFilterable!: boolean;

  @Column({ name: 'validation_regex', length: 200, nullable: true })
  validationRegex?: string;

  @Column({ name: 'min_value', type: 'numeric', nullable: true })
  minValue?: number | null;

  @Column({ name: 'max_value', type: 'numeric', nullable: true })
  maxValue?: number | null;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex!: number;

  @Column({ name: 'is_system', default: false })
  isSystem!: boolean;

  @OneToMany(() => ProductAttribute, (pa) => pa.definition)
  values?: ProductAttribute[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}