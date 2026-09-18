// apps/admin-api/src/entities/notification.entity.ts
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

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // null = notificación global (para todos los admins)
  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.INFO,
  })
  @Index()
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  @Index()
  priority: NotificationPriority;

  @Column({ nullable: true })
  @Index()
  category: string; // user, order, inventory, budget, system

  @Column({ default: false, name: 'is_read' })
  @Index()
  isRead: boolean;

  @Column({ name: 'read_at', nullable: true })
  readAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  actionUrl: string; // Link a la acción relacionada

  @Column({ nullable: true })
  actionLabel: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
