// apps/admin-api/src/modules/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { UsersService } from './users.service';
import { User, Role, NotificationType, NotificationPriority } from '@ecommerce/core';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// ============================================
// MOCKS
// ============================================
const mockUsersRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockRolesRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
};

const mockNotificationsService = {
  notifyAll: jest.fn(),
  create: jest.fn(),
};

const mockAuditService = {
  log: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: typeof mockUsersRepository;
  let rolesRepository: typeof mockRolesRepository;
  let notificationsService: typeof mockNotificationsService;
  let auditService: typeof mockAuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: getRepositoryToken(Role), useValue: mockRolesRepository },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
    rolesRepository = module.get(getRepositoryToken(Role));
    notificationsService = module.get(NotificationsService);
    auditService = module.get(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const createDto: CreateUserDto = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
      role: 'user',
    };

    it('should create a user as super_admin with specified tenant', async () => {
      const mockUser = {
        id: 'user-1',
        ...createDto,
        tenantId: 'tenant-1',
        isSuperAdmin: false,
        password: 'hashed',
      };

      usersRepository.findOne.mockResolvedValue(null);
      usersRepository.create.mockReturnValue(mockUser);
      usersRepository.save.mockResolvedValue(mockUser);
      notificationsService.notifyAll.mockResolvedValue({});

      const result = await service.create(createDto, 'tenant-1', true);

      expect(result.email).toBe('new@example.com');
      expect(result.tenantId).toBe('tenant-1');
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          tenantId: 'tenant-1',
        }),
      );
    });

    it('should create a user as admin (uses admin tenantId)', async () => {
      const mockUser = {
        id: 'user-1',
        ...createDto,
        tenantId: 'tenant-admin',
        isSuperAdmin: false,
        password: 'hashed',
      };

      usersRepository.findOne.mockResolvedValue(null);
      usersRepository.create.mockReturnValue(mockUser);
      usersRepository.save.mockResolvedValue(mockUser);
      notificationsService.notifyAll.mockResolvedValue({});

      const result = await service.create(createDto, 'tenant-admin', false);

      expect(result.tenantId).toBe('tenant-admin');
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-admin',
        }),
      );
    });

    it('should ignore tenantId from dto when admin is not super_admin', async () => {
      const dtoWithTenant = { ...createDto, tenantId: 'tenant-otro' };

      const mockUser = {
        id: 'user-1',
        ...dtoWithTenant,
        tenantId: 'tenant-admin',
        isSuperAdmin: false,
        password: 'hashed',
      };

      usersRepository.findOne.mockResolvedValue(null);
      usersRepository.create.mockReturnValue(mockUser);
      usersRepository.save.mockResolvedValue(mockUser);
      notificationsService.notifyAll.mockResolvedValue({});

      await service.create(dtoWithTenant, 'tenant-admin', false);

      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-admin',
        }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      usersRepository.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'new@example.com',
      });

      await expect(
        service.create(createDto, 'tenant-1', true),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create(createDto, 'tenant-1', true),
      ).rejects.toThrow('El email ya está registrado');
    });

    it('should throw ConflictException if admin tries to create super_admin', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ ...createDto, isSuperAdmin: true }, 'tenant-1', false),
      ).rejects.toThrow('No puedes crear super admins');
    });

    it('should send notification after creating user', async () => {
      const mockUser = {
        id: 'user-1',
        ...createDto,
        tenantId: 'tenant-1',
        isSuperAdmin: false,
        password: 'hashed',
      };

      usersRepository.findOne.mockResolvedValue(null);
      usersRepository.create.mockReturnValue(mockUser);
      usersRepository.save.mockResolvedValue(mockUser);
      notificationsService.notifyAll.mockResolvedValue({});

      await service.create(createDto, 'tenant-1', true);

      expect(notificationsService.notifyAll).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '👤 Usuario creado',
          type: NotificationType.SUCCESS,
          priority: NotificationPriority.LOW,
          category: 'user',
        }),
      );
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should return all users if isSuperAdmin is true', async () => {
      usersRepository.find.mockResolvedValue([
        { id: 'user-1', tenantId: 'tenant-1' },
        { id: 'user-2', tenantId: 'tenant-2' },
      ]);

      const result = await service.findAll('tenant-1', true);

      expect(result).toHaveLength(2);
      expect(usersRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('should return only tenant users if isSuperAdmin is false', async () => {
      usersRepository.find.mockResolvedValue([{ id: 'user-1', tenantId: 'tenant-1' }]);

      const result = await service.findAll('tenant-1', false);

      expect(result).toHaveLength(1);
      expect(usersRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
      );
    });

    it('should include roles and tenant relations', async () => {
      usersRepository.find.mockResolvedValue([]);

      await service.findAll('tenant-1', false);

      expect(usersRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['roles', 'tenant'],
          order: { createdAt: 'DESC' },
        }),
      );
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return user by id', async () => {
      const mockUser = { id: 'user-1', roles: [], tenant: null };
      usersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('user-1');

      expect(result).toEqual(mockUser);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        relations: ['roles', 'tenant'],
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('user-1')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('user-1')).rejects.toThrow(
        'Usuario con ID user-1 no encontrado',
      );
    });
  });

  // ============================================
  // FIND BY EMAIL
  // ============================================
  describe('findByEmail', () => {
    it('should return user with password included', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', password: 'hashed' };
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      usersRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(qb.addSelect).toHaveBeenCalledWith('user.password');
    });

    it('should return null if user not found', async () => {
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      usersRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    const updateDto: UpdateUserDto = { name: 'Updated Name' };

    it('should update user name', async () => {
      const mockUser = { id: 'user-1', name: 'Old Name', password: 'hashed' };
      usersRepository.findOne.mockResolvedValue(mockUser);
      usersRepository.save.mockResolvedValue({ ...mockUser, name: 'Updated Name' });

      const result = await service.update('user-1', updateDto);

      expect(result.name).toBe('Updated Name');
      expect(usersRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if new email already exists', async () => {
      usersRepository.findOne
        .mockResolvedValueOnce({ id: 'user-1', email: 'old@example.com' })
        .mockResolvedValueOnce({ id: 'user-2', email: 'new@example.com' });

      await expect(
        service.update('user-1', { email: 'new@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating to same email', async () => {
      const mockUser = { id: 'user-1', email: 'same@example.com' };
      usersRepository.findOne.mockResolvedValue(mockUser);
      usersRepository.save.mockResolvedValue(mockUser);

      const result = await service.update('user-1', { email: 'same@example.com' });

      expect(result).toBeDefined();
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove user and send notification', async () => {
      const mockUser = { id: 'user-1', name: 'Test User', email: 'test@example.com' };
      usersRepository.findOne.mockResolvedValue(mockUser);
      usersRepository.remove.mockResolvedValue(mockUser);
      notificationsService.notifyAll.mockResolvedValue({});

      const result = await service.remove('user-1');

      expect(result).toHaveProperty('message', 'Usuario eliminado correctamente');
      expect(usersRepository.remove).toHaveBeenCalledWith(mockUser);
      expect(notificationsService.notifyAll).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '🗑️ Usuario eliminado',
          type: NotificationType.WARNING,
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // TOGGLE ACTIVE
  // ============================================
  describe('toggleActive', () => {
    it('should toggle user from active to inactive', async () => {
      const mockUser = { id: 'user-1', isActive: true };
      usersRepository.findOne.mockResolvedValue(mockUser);
      usersRepository.save.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await service.toggleActive('user-1');

      expect(result.isActive).toBe(false);
    });

    it('should toggle user from inactive to active', async () => {
      const mockUser = { id: 'user-1', isActive: false };
      usersRepository.findOne.mockResolvedValue(mockUser);
      usersRepository.save.mockResolvedValue({ ...mockUser, isActive: true });

      const result = await service.toggleActive('user-1');

      expect(result.isActive).toBe(true);
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return global stats for super_admin', async () => {
      usersRepository.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(10);

      const result = await service.getStats('tenant-1', true);

      expect(result).toEqual({
        total: 100,
        active: 80,
        inactive: 20,
        admins: 10,
        regularUsers: 90,
      });
    });

    it('should return tenant-only stats for admin', async () => {
      usersRepository.count
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(3);

      const result = await service.getStats('tenant-1', false);

      expect(result).toEqual({
        total: 15,
        active: 12,
        inactive: 3,
        admins: 3,
        regularUsers: 12,
      });
      expect(usersRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
      );
    });
  });

  // ============================================
  // ASSIGN ROLE (nuevo)
  // ============================================
  describe('assignRole', () => {
    it('should assign a role successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'user',
        tenantId: 'tenant-1',
        roles: [],
      };
      const mockRole = { id: 'role-1', name: 'admin' };

      usersRepository.findOne.mockResolvedValue(mockUser);
      rolesRepository.findOne.mockResolvedValue(mockRole);
      usersRepository.save.mockResolvedValue({ ...mockUser, role: 'admin' });
      auditService.log.mockResolvedValue({});
      notificationsService.create.mockResolvedValue({});

      const result = await service.assignRole('user-1', 'admin', 'admin-1', 'tenant-1', false);

      expect(result.role).toBe('admin');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'assign_role' }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignRole('user-1', 'admin', 'admin-1', 'tenant-1', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if role not found', async () => {
      usersRepository.findOne.mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1' });
      rolesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignRole('user-1', 'inexistente', 'admin-1', 'tenant-1', false),
      ).rejects.toThrow('El rol "inexistente" no existe');
    });

    it('should throw ConflictException if admin tries to modify user from another tenant', async () => {
      usersRepository.findOne.mockResolvedValue({ id: 'user-1', tenantId: 'tenant-2' });

      await expect(
        service.assignRole('user-1', 'admin', 'admin-1', 'tenant-1', false),
      ).rejects.toThrow('No puedes modificar usuarios de otros tenants');
    });
  });
});