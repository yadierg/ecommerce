// libs/core/src/lib/entities/session.entity.ts
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

@Entity({ name: 'sessions' })
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  @Index()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'refresh_token', unique: true })
  @Index()
  refreshToken!: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress!: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent!: string;

  @Column({ name: 'expires_at' })
  expiresAt!: Date;

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ name: 'last_used_at', nullable: true })
  lastUsedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}