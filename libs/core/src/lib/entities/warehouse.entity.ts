// libs/core/src/lib/entities/warehouse.entity.ts
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
import { Tenant } from './tenant.entity';

@Entity({ name: 'warehouses' })
export class Warehouse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ============================================
  // MULTI-TENANT
  // ============================================
  @Column({ name: 'tenant_id' })
  @Index()
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  // ============================================
  // INFORMACIÓN BÁSICA
  // ============================================
  @Column()
  name!: string;

  @Column()
  @Index()
  code!: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  // ============================================
  // DIRECCIÓN
  // ============================================
  @Column({ nullable: true, type: 'text' })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true, name: 'postal_code' })
  postalCode?: string;

  @Column({ nullable: true })
  country?: string;

  // ============================================
  // CONTACTO
  // ============================================
  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true, name: 'manager_name' })
  managerName?: string;

  // ============================================
  // CAPACIDAD Y ESTADO
  // ============================================
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'capacity',
  })
  capacity?: number;

  @Column({ default: true, name: 'is_active' })
  @Index()
  isActive!: boolean;

  @Column({ default: false, name: 'is_default' })
  @Index()
  isDefault!: boolean;

  // ============================================
  // EXTRAS
  // ============================================
  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}