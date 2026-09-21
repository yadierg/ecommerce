// libs/core/src/lib/entities/permission.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import { Role } from './role.entity';

@Entity({ name: 'permissions' })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @Index()
  name!: string; // users.create, products.read

  @Column()
  @Index()
  resource!: string; // users, products, orders

  @Column()
  action!: string; // create, read, update, delete

  @Column({ nullable: true })
  description!: string;

  @Column({ default: 'system' })
  category!: string; // system, custom

  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}