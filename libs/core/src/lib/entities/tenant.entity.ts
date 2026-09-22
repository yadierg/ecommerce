// libs/core/src/lib/entities/tenant.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

@Entity({ name: 'tenants' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @Index()
  slug!: string; // "instel", "technostore"

  @Column()
  name!: string; // "Instel S.A."

  @Column({ nullable: true })
  legalName?: string; // "Instel Sociedad Anónima"

  @Column({ nullable: true })
  taxId?: string; // NIT/RUC/ID fiscal

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  logo?: string;

  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  @Column({ default: true, name: 'is_active' })
  @Index()
  isActive!: boolean;

  @Column({ default: 'basic', name: 'plan' })
  plan!: string; // basic, pro, enterprise

  @Column({ nullable: true, name: 'plan_expires_at' })
  planExpiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}