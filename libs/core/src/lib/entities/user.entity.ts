// libs/core/src/lib/entities/user.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  Index,
  ManyToMany,
  JoinTable,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from './role.entity';
import { Tenant } from './tenant.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @Index()
  email!: string;

  @Column({ select: false })
  password!: string;

  @Column()
  name!: string;

  @Column({ default: 'user' })
  role!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true, name: 'last_login' })
  lastLogin?: Date;

  // ============================================
  // MULTI-TENANT
  // ============================================
  @Column({ name: 'tenant_id', nullable: true })
  @Index()
  tenantId?: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ default: false, name: 'is_super_admin' })
  @Index()
  isSuperAdmin!: boolean; // Solo el super admin puede ver todos los tenants

  // ============================================
  // RELACIONES
  // ============================================
  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles!: Role[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}