// apps/admin-api/src/modules/notifications/notifications.service.ts
import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, IsNull, Or , Equal} from 'typeorm';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from '../../entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  // ============================================
  // CREATE
  // ============================================
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationsRepository.create(dto);
    const saved = await this.notificationsRepository.save(notification);

    this.logger.log(
      `📬 Notificación creada: ${saved.title} (${saved.type})`,
    );

    return saved;
  }

  // ============================================
  // NOTIFICAR A TODOS LOS ADMINS (global)
  // ============================================
  async notifyAll(dto: Omit<CreateNotificationDto, 'userId'>) {
    return this.create({ ...dto, userId: null });
  }

  // ============================================
  // READ (filtradas por usuario)
  // ============================================
  async findAll(userId: string, query: QueryNotificationDto) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    // El usuario ve sus notificaciones + las globales (userId = null)
    const baseWhere: FindOptionsWhere<Notification> = {
      userId: Or(Equal(userId), IsNull()),
    };

    if (filters.category) baseWhere.category = filters.category;
    if (filters.type) baseWhere.type = filters.type;
    if (filters.priority) baseWhere.priority = filters.priority;
    if (filters.isRead !== undefined) baseWhere.isRead = filters.isRead;

    const [data, total] = await this.notificationsRepository.findAndCount({
      where: baseWhere,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Contar no leídas
    const unreadCount = await this.notificationsRepository.count({
      where: { ...baseWhere, isRead: false },
    });

    return {
      data,
      meta: {
        total,
        unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // READ ONE
  // ============================================
  async findOne(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    // Solo puede ver las suyas o las globales
    if (notification.userId && notification.userId !== userId) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return notification;
  }

  // ============================================
  // MARK AS READ
  // ============================================
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.findOne(id, userId);

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      return this.notificationsRepository.save(notification);
    }

    return notification;
  }

  // ============================================
  // MARK ALL AS READ
  // ============================================
  async markAllAsRead(userId: string) {
    const result = await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('is_read = :isRead', { isRead: false })
      .andWhere('(user_id = :userId OR user_id IS NULL)', { userId })
      .execute();

    return {
      message: 'Todas las notificaciones marcadas como leídas',
      updated: result.affected || 0,
    };
  }

  // ============================================
  // UNREAD COUNT
  // ============================================
  async getUnreadCount(userId: string) {
    const count = await this.notificationsRepository.count({
      where: {
        userId: Or(Equal(userId), IsNull()),
        isRead: false,
      },
    });

    return { unreadCount: count };
  }

  // ============================================
  // DELETE
  // ============================================
  async remove(id: string, userId: string) {
    const notification = await this.findOne(id, userId);
    await this.notificationsRepository.remove(notification);
    return { message: 'Notificación eliminada' };
  }

  // ============================================
  // DELETE ALL READ (limpieza)
  // ============================================
  async deleteAllRead(userId: string) {
    const result = await this.notificationsRepository
      .createQueryBuilder()
      .delete()
      .where('is_read = :isRead', { isRead: true })
      .andWhere('user_id = :userId', { userId })
      .execute();

    return {
      message: 'Notificaciones leídas eliminadas',
      deleted: result.affected || 0,
    };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(userId: string) {
    const total = await this.notificationsRepository.count({
      where: { userId: Or(Equal(userId), IsNull()) },
    });

    const byType = await this.notificationsRepository
      .createQueryBuilder('n')
      .select('n.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('n.user_id = :userId OR n.user_id IS NULL', { userId })
      .groupBy('n.type')
      .getRawMany();

    const byPriority = await this.notificationsRepository
      .createQueryBuilder('n')
      .select('n.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .where('n.user_id = :userId OR n.user_id IS NULL', { userId })
      .groupBy('n.priority')
      .getRawMany();

    const unreadCount = await this.notificationsRepository.count({
      where: {
        userId: Or(Equal(userId), IsNull()),
        isRead: false,
      },
    });

    return {
      total,
      unread: unreadCount,
      read: total - unreadCount,
      byType,
      byPriority,
    };
  }
}
