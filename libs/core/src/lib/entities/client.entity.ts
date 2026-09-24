// libs/core/src/lib/entities/client.entity.ts
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

@Entity({ name: 'clients' })
export class Client {
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
  // IDENTIFICACIÓN
  // ============================================
  @Column()
  @Index()
  name!: string;

  @Column({ nullable: true })
  @Index()
  company?: string;

  @Column({ nullable: true })
  @Index()
  email?: string;

  @Column({ nullable: true })
  @Index()
  phone?: string;

  @Column({ nullable: true, name: 'phone_alt' })
  phoneAlt?: string;

  @Column({ nullable: true, name: 'tax_id' })
  @Index()
  taxId?: string; // NIT/RUC/ID fiscal

  @Column({ nullable: true, name: 'id_number' })
  idNumber?: string; // Cédula/ID personal

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
  // CLASIFICACIÓN
  // ============================================
  @Column({ default: 'individual' })
  @Index()
  type!: string; // individual, business, government

  @Column({ nullable: true })
  @Index()
  category?: string; // residential, commercial, industrial

  @Column({ nullable: true })
  source?: string; // referral, web, ad, phone

  // ============================================
  // COMERCIAL
  // ============================================
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'credit_limit' })
  creditLimit!: number;

  @Column({ type: 'int', default: 0, name: 'payment_terms' })
  paymentTerms!: number;

  @Column({ nullable: true })
  currency?: string;

  // ============================================
  // ESTADO
  // ============================================
  @Column({ default: true, name: 'is_active' })
  @Index()
  isActive!: boolean;

  @Column({ default: false, name: 'is_vip' })
  @Index()
  isVip!: boolean;

  // ============================================
  // ESTADÍSTICAS (cache)
  // ============================================
  @Column({ type: 'int', default: 0, name: 'total_projects' })
  totalProjects!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'total_revenue',
  })
  totalRevenue!: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_project_at' })
  lastProjectAt?: Date;

  // ============================================
  // EXTRAS
  // ============================================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}