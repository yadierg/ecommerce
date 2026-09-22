// libs/core/src/lib/entities/cart.entity.ts
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
import { CartItem } from './cart-item.entity';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';

@Entity({ name: 'carts' })
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', nullable: true })
  @Index()
  tenantId?: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  // Usuario registrado (opcional)
  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId?: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // ID de sesión para usuarios no registrados (guest)
  @Column({ name: 'session_id', nullable: true })
  @Index()
  sessionId?: string | null;

  @OneToMany(() => CartItem, (item) => item.cart, {
    cascade: true,
    eager: true,
  })
  items!: CartItem[];

  @Column({ default: 'active' })
  @Index()
  status!: string; // active, converted, abandoned

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'subtotal',
  })
  subtotal!: number;

  @Column({ nullable: true, name: 'coupon_code' })
  couponCode?: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'discount',
  })
  discount!: number;

  @Column({ nullable: true, name: 'expires_at' })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}