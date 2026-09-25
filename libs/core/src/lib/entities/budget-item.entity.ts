// libs/core/src/lib/entities/budget-item.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Budget } from './budget.entity';
import { Product } from './product.entity';

@Entity({ name: 'budget_items' })
export class BudgetItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'budget_id' })
  @Index()
  budgetId!: string;

  @ManyToOne(() => Budget, (budget) => budget.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget!: Budget;

  @Column({ name: 'product_id', nullable: true })
  @Index()
  productId?: string;

  @ManyToOne(() => Product, {
    onDelete: 'SET NULL',
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  // Snapshot
  @Column({ name: 'product_name' })
  productName!: string;

  @Column({ nullable: true, name: 'product_sku' })
  productSku?: string;

  @Column({ nullable: true, name: 'product_description', type: 'text' })
  productDescription?: string;

  // Cantidad y precios
  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'unit_price' })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'tax_rate' })
  taxRate!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'int', default: 1 })
  order!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}