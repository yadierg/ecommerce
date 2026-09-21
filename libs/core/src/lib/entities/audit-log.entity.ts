// libs/core/src/lib/entities/audit-log.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ nullable: true })
  @Index()
  action!: string; // create, update, delete, login, logout, view

  @Column({ nullable: true })
  @Index()
  entity!: string; // user, product, order, setting

  @Column({ name: 'entity_id', nullable: true })
  entityId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  changes!: Record<string, any>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress!: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent!: string;

  @Column({ nullable: true, type: 'text' })
  description!: string;

  @Column({ name: 'status_code', nullable: true })
  statusCode!: number;

  @Column({ name: 'duration_ms', nullable: true })
  durationMs!: number;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;
}