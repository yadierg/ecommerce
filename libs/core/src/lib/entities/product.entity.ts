// libs/core/src/lib/entities/product.entity.ts
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
import { Category } from './category.entity';
import { Tenant } from './tenant.entity';

@Entity({ name: 'products' })
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  name!: string;

  @Column({ unique: true })
  @Index()
  slug!: string;

  @Column({ unique: true })
  @Index()
  sku!: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ nullable: true, type: 'text', name: 'short_description' })
  shortDescription?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'compare_price',
  })
  comparePrice?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'cost_price',
  })
  costPrice?: number;

  @Column({ default: 0 })
  stock!: number;

  @Column({ default: 10, name: 'low_stock_threshold' })
  lowStockThreshold!: number;

  @Column({ nullable: true, name: 'category_id' })
  @Index()
  categoryId?: string;

  @Column({ name: 'tenant_id', nullable: true })
  @Index()
  tenantId?: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @Column({ nullable: true })
  brand?: string;

  @Column({ type: 'jsonb', default: [] })
  images!: string[];

  @Column({ nullable: true, name: 'main_image' })
  mainImage?: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 3,
    default: 0,
  })
  weight!: number;

  @Column({ type: 'jsonb', nullable: true })
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };

  @Column({ default: true, name: 'is_active' })
  @Index()
  isActive!: boolean;

  @Column({ default: false, name: 'is_featured' })
  @Index()
  isFeatured!: boolean;

  @Column({ default: false, name: 'is_digital' })
  isDigital!: boolean;

  @Column({ default: 0, name: 'view_count' })
  viewCount!: number;

  @Column({ default: 0, name: 'sold_count' })
  soldCount!: number;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
    name: 'rating_average',
  })
  ratingAverage!: number;

  @Column({ default: 0, name: 'rating_count' })
  ratingCount!: number;

  @Column({ nullable: true, name: 'meta_title' })
  metaTitle?: string;

  @Column({ nullable: true, name: 'meta_description', type: 'text' })
  metaDescription?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}