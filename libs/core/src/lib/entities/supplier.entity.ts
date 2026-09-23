// libs/core/src/lib/entities/supplier.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity({ name: 'suppliers' })
@Unique('UQ_supplier_tenant_code', ['tenantId', 'code'])
export class Supplier {
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
  @Index()
  name!: string;

  @Column()
  @Index()
  code!: string;

  @Column({ nullable: true, name: 'legal_name' })
  legalName?: string;

  @Column({ nullable: true, name: 'tax_id' })
  taxId?: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  // ============================================
  // CONTACTO
  // ============================================
  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  website?: string;

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
  // PERSONA DE CONTACTO
  // ============================================
  @Column({ nullable: true, name: 'contact_name' })
  contactName?: string;

  @Column({ nullable: true, name: 'contact_email' })
  contactEmail?: string;

  @Column({ nullable: true, name: 'contact_phone' })
  contactPhone?: string;

  @Column({ nullable: true, name: 'contact_position' })
  contactPosition?: string;

  // ============================================
  // CONDICIONES COMERCIALES
  // ============================================
  @Column({ type: 'int', default: 0, name: 'payment_terms' })
  paymentTerms!: number; // días de crédito

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'credit_limit',
  })
  creditLimit?: number;

  @Column({ nullable: true, name: 'currency' })
  currency?: string; // USD, EUR, CUP

  // ============================================
  // ESTADO
  // ============================================
  @Column({ default: true, name: 'is_active' })
  @Index()
  isActive!: boolean;

  @Column({ default: false, name: 'is_preferred' })
  isPreferred!: boolean;

  // ============================================
  // EXTRAS
  // ============================================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}