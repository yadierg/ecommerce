// apps/admin-api/src/entities/user.entity.ts
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
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from './role.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ select: false })
  password: string;

  @Column()
  name: string;

  @Column({ default: 'user' })
  role: string; // Campo legacy (mantener por compatibilidad)

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, name: 'last_login' })
  lastLogin: Date;

  // ✅ NUEVA RELACIÓN
  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}