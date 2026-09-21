// libs/core/src/lib/entities/order.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { User } from './user.entity';

export enum OrderStatus {
  PENDING = 'pending',       // Creado, esperando pago
  PAID = 'paid',             // Pagado
  PROCESSING = 'processing', // En preparación
  SHIPPED = 'shipped',       // Enviado
  DELIVERED = 'delivered',   // Entregado
  CANCELLED = 'cancelled',   // Cancelado
  REFUNDED = 'refunded',     // Reembolsado
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
}

@Entity({ name: 'orders' })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, name: 'order_number' })
  @Index()
  orderNumber!: string;

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'customer_email' })
  customerEmail!: string;

  @Column({ name: 'customer_name' })
  customerName!: string;

  @Column({ nullable: true, name: 'customer_phone' })
  customerPhone?: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  @Index()
  status!: OrderStatus;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  @Index()
  paymentStatus!: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod?: PaymentMethod;

  // Dirección de envío
  @Column({ name: 'shipping_address', type: 'jsonb' })
  shippingAddress!: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  // Totales
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'subtotal' })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'tax' })
  tax!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'shipping' })
  shipping!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'discount' })
  discount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total!: number;

  @Column({ nullable: true, name: 'coupon_code' })
  couponCode?: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items!: OrderItem[];

  // Tracking
  @Column({ nullable: true, name: 'tracking_number' })
  trackingNumber?: string;

  @Column({ nullable: true, name: 'shipped_at' })
  shippedAt?: Date;

  @Column({ nullable: true, name: 'delivered_at' })
  deliveredAt?: Date;

  @Column({ nullable: true, name: 'paid_at' })
  paidAt?: Date;

  @Column({ nullable: true, name: 'cancelled_at' })
  cancelledAt?: Date;

  @Column({ nullable: true, name: 'cancel_reason', type: 'text' })
  cancelReason?: string;

  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}