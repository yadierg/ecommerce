// libs/core/src/lib/entities/purchase-order-item.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { Product } from './product.entity';

@Entity({ name: 'purchase_order_items' })
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'purchase_order_id' })
  @Index()
  purchaseOrderId!: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder!: PurchaseOrder;

  @Column({ name: 'product_id', nullable: true })
  @Index()
  productId?: string;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  // Snapshot del producto
  @Column({ name: 'product_name' })
  productName!: string;

  @Column({ nullable: true, name: 'product_sku' })
  productSku?: string;

  // Cantidades
  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'int', default: 0, name: 'quantity_received' })
  quantityReceived!: number;

  // Precios
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'unit_price' })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'tax_rate' })
  taxRate!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}