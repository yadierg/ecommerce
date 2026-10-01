// apps/admin-api/src/modules/notifications/notifications.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from '@ecommerce/core';

const mockNotificationsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationsRepository: typeof mockNotificationsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationsRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationsRepository = module.get(getRepositoryToken(Notification));
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.values(mockNotificationsRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const mockNotification = (
    overrides: Partial<Notification> = {},
  ): Notification =>
    ({
      id: 'notif-1',
      userId: 'user-1',
      title: 'Nuevo pedido',
      message: 'Pedido #1234',
      type: NotificationType.INFO,
      priority: NotificationPriority.NORMAL,
      category: 'order',
      isRead: false,
      readAt: null,
      metadata: null,
      actionUrl: null,
      actionLabel: null,
      createdAt: new Date(),
      ...overrides,
    }) as Notification;

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    it('should create notification', async () => {
      const dto = {
        userId: 'user-1',
        title: 'Test',
        message: 'Msg',
      };
      notificationsRepository.create.mockImplementation((data) => data);
      notificationsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'notif-1' }),
      );

      const result = await service.create(dto);

      expect(result.id).toBe('notif-1');
    });
  });

  // ============================================
  // NOTIFY ALL
  // ============================================
  describe('notifyAll', () => {
    it('should create notification with userId null', async () => {
      notificationsRepository.create.mockImplementation((data) => data);
      notificationsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'notif-1' }),
      );

      await service.notifyAll({ title: 'Global', message: 'Para todos' });

      expect(notificationsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null }),
      );
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should return user notifications + global ones', async () => {
      const notifications = [mockNotification()];
      notificationsRepository.findAndCount.mockResolvedValue([
        notifications,
        1,
      ]);
      notificationsRepository.count.mockResolvedValue(0);

      const result = await service.findAll('user-1', {});

      expect(result.data).toEqual(notifications);
      expect(result.meta.total).toBe(1);
    });

    it('should include unreadCount in meta', async () => {
      notificationsRepository.findAndCount.mockResolvedValue([[], 0]);
      notificationsRepository.count.mockResolvedValue(3);

      const result = await service.findAll('user-1', {});

      expect(result.meta.unreadCount).toBe(3);
    });

    it('should apply pagination', async () => {
      notificationsRepository.findAndCount.mockResolvedValue([[], 0]);
      notificationsRepository.count.mockResolvedValue(0);

      await service.findAll('user-1', { page: 2, limit: 10 });

      expect(notificationsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter by category, type, priority, isRead', async () => {
      notificationsRepository.findAndCount.mockResolvedValue([[], 0]);
      notificationsRepository.count.mockResolvedValue(0);

      await service.findAll('user-1', {
        category: 'order',
        type: NotificationType.WARNING,
        priority: NotificationPriority.HIGH,
        isRead: false,
      });

      const findCall = notificationsRepository.findAndCount.mock.calls[0][0];
      expect(findCall.where.category).toBe('order');
      expect(findCall.where.type).toBe(NotificationType.WARNING);
      expect(findCall.where.priority).toBe(NotificationPriority.HIGH);
      expect(findCall.where.isRead).toBe(false);
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return user own notification', async () => {
      const notif = mockNotification({ userId: 'user-1' });
      notificationsRepository.findOne.mockResolvedValue(notif);

      const result = await service.findOne('notif-1', 'user-1');

      expect(result).toEqual(notif);
    });

    it('should return global notification (userId null)', async () => {
      const notif = mockNotification({ userId: null });
      notificationsRepository.findOne.mockResolvedValue(notif);

      const result = await service.findOne('notif-1', 'user-1');

      expect(result).toEqual(notif);
    });

    it('should throw NotFoundException if notification belongs to other user', async () => {
      notificationsRepository.findOne.mockResolvedValue(
        mockNotification({ userId: 'other-user' }),
      );

      await expect(service.findOne('notif-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if not found', async () => {
      notificationsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('notif-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // MARK AS READ
  // ============================================
  describe('markAsRead', () => {
    it('should set isRead and readAt if not read', async () => {
      const notif = mockNotification({ isRead: false, userId: 'user-1' });
      notificationsRepository.findOne.mockResolvedValue(notif);
      notificationsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeInstanceOf(Date);
    });

    it('should not modify if already read', async () => {
      const notif = mockNotification({ isRead: true, userId: 'user-1' });
      notificationsRepository.findOne.mockResolvedValue(notif);

      await service.markAsRead('notif-1', 'user-1');

      expect(notificationsRepository.save).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // MARK ALL AS READ
  // ============================================
  describe('markAllAsRead', () => {
    it('should update all unread notifications of user', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };
      notificationsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.markAllAsRead('user-1');

      expect(result.updated).toBe(5);
      expect(result.message).toContain('marcadas como leídas');
    });

    it('should handle no affected rows', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      notificationsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.markAllAsRead('user-1');

      expect(result.updated).toBe(0);
    });
  });

  // ============================================
  // GET UNREAD COUNT
  // ============================================
  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      notificationsRepository.count.mockResolvedValue(7);

      const result = await service.getUnreadCount('user-1');

      expect(result).toEqual({ unreadCount: 7 });
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove notification', async () => {
      const notif = mockNotification({ userId: 'user-1' });
      notificationsRepository.findOne.mockResolvedValue(notif);
      notificationsRepository.remove.mockResolvedValue(notif);

      const result = await service.remove('notif-1', 'user-1');

      expect(result).toEqual({ message: 'Notificación eliminada' });
      expect(notificationsRepository.remove).toHaveBeenCalledWith(notif);
    });

    it('should throw if notification belongs to other user', async () => {
      notificationsRepository.findOne.mockResolvedValue(
        mockNotification({ userId: 'other-user' }),
      );

      await expect(service.remove('notif-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // DELETE ALL READ
  // ============================================
  describe('deleteAllRead', () => {
    it('should delete read notifications of user', async () => {
      const qb = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      notificationsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.deleteAllRead('user-1');

      expect(result.deleted).toBe(3);
      expect(result.message).toContain('leídas eliminadas');
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return full statistics', async () => {
      notificationsRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // unread

      const byTypeQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ type: 'info', count: '5' }]),
      };
      const byPriorityQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ priority: 'normal', count: '10' }]),
      };

      notificationsRepository.createQueryBuilder
        .mockReturnValueOnce(byTypeQb)
        .mockReturnValueOnce(byPriorityQb);

      const result = await service.getStats('user-1');

      expect(result.total).toBe(10);
      expect(result.unread).toBe(3);
      expect(result.read).toBe(7);
      expect(result.byType).toHaveLength(1);
      expect(result.byPriority).toHaveLength(1);
    });
  });
});