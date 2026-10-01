// apps/admin-api/src/modules/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { User, Session, Role } from '@ecommerce/core';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// ============================================
// MOCKS
// ============================================
const mockUsersRepository = {
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockSessionsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockRolesRepository = {
  findOne: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockAuditService = {
  log: jest.fn(),
};

const mockNotificationsService = {
  notifyAll: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: typeof mockUsersRepository;
  let sessionsRepository: typeof mockSessionsRepository;
  let rolesRepository: typeof mockRolesRepository;
  let jwtService: typeof mockJwtService;
  let configService: typeof mockConfigService;
  let auditService: typeof mockAuditService;
  let notificationsService: typeof mockNotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: getRepositoryToken(Session), useValue: mockSessionsRepository },
        { provide: getRepositoryToken(Role), useValue: mockRolesRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get(getRepositoryToken(User));
    sessionsRepository = module.get(getRepositoryToken(Session));
    rolesRepository = module.get(getRepositoryToken(Role));
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    auditService = module.get(AuditService);
    notificationsService = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // LOGIN
  // ============================================
  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'user',
        isActive: true,
        tenantId: 'tenant-1',
        isSuperAdmin: false,
        roles: [
          {
            id: 'role-1',
            name: 'user',
            permissions: [
              { id: 'perm-1', name: 'users.read' },
              { id: 'perm-2', name: 'products.read' },
            ],
          },
        ],
      };

      const mockQueryBuilder = {
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };

      usersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      usersRepository.update.mockResolvedValue({ affected: 1 });
      jwtService.sign.mockReturnValue('mock-access-token');
      configService.get.mockImplementation((key: string) => {
        const config = {
          JWT_SECRET: 'test-secret',
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return config[key];
      });
      sessionsRepository.create.mockReturnValue({});
      sessionsRepository.save.mockResolvedValue({});
      auditService.log.mockResolvedValue({});

      const result = await service.login(loginDto, '127.0.0.1', 'jest-test');

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('tokenType', 'Bearer');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.roles).toEqual(['user']);
      expect(result.permissions).toContain('users.read');
      expect(usersRepository.update).toHaveBeenCalledWith(mockUser.id, {
        lastLogin: expect.any(Date),
      });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          action: 'login',
        }),
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const mockQueryBuilder = {
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      usersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Credenciales inválidas',
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: hashedPassword,
        isActive: true,
        roles: [],
      };

      const mockQueryBuilder = {
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };

      usersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: hashedPassword,
        isActive: false,
        roles: [],
      };

      const mockQueryBuilder = {
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };

      usersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(service.login(loginDto)).rejects.toThrow(
        'Usuario inactivo',
      );
    });
  });

  // ============================================
  // REGISTER
  // ============================================
  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    };

    it('should register a new user successfully', async () => {
      const mockRole = { id: 'role-1', name: 'user' };
      const mockUser = {
        id: 'user-1',
        email: 'new@example.com',
        name: 'New User',
        role: 'user',
        password: 'hashed',
      };

      usersRepository.findOne.mockResolvedValue(null);
      rolesRepository.findOne.mockResolvedValue(mockRole);
      usersRepository.create.mockReturnValue(mockUser);
      usersRepository.save.mockResolvedValue(mockUser);
      auditService.log.mockResolvedValue({});
      notificationsService.notifyAll.mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('message', 'Usuario registrado exitosamente');
      expect(result.user.email).toBe('new@example.com');
      expect(usersRepository.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'register',
        }),
      );
      expect(notificationsService.notifyAll).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const existingUser = { id: 'user-1', email: 'new@example.com' };
      usersRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'El email ya está registrado',
      );
    });

    it('should register user without default role if role not found', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'new@example.com',
        name: 'New User',
        role: 'user',
        password: 'hashed',
      };

      usersRepository.findOne.mockResolvedValue(null);
      rolesRepository.findOne.mockResolvedValue(null);
      usersRepository.create.mockReturnValue({ ...mockUser, roles: [] });
      usersRepository.save.mockResolvedValue({ ...mockUser, roles: [] });
      auditService.log.mockResolvedValue({});
      notificationsService.notifyAll.mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(result.user.email).toBe('new@example.com');
    });
  });

  // ============================================
  // REFRESH TOKEN
  // ============================================
  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const mockSession = {
        id: 'session-1',
        refreshToken: 'valid-token',
        isActive: true,
        expiresAt: new Date(Date.now() + 100000),
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'user',
          tenantId: 'tenant-1',
          isSuperAdmin: false,
          roles: [],
        },
      };

      sessionsRepository.findOne.mockResolvedValue(mockSession);
      sessionsRepository.save.mockResolvedValue(mockSession);
      sessionsRepository.update.mockResolvedValue({ affected: 1 });
      sessionsRepository.create.mockReturnValue({});
      jwtService.sign.mockReturnValue('new-access-token');
      configService.get.mockReturnValue('test-secret');

      const result = await service.refreshToken('valid-token');

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(sessionsRepository.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      sessionsRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        'Refresh token inválido',
      );
    });

    it('should throw UnauthorizedException if refresh token expired', async () => {
      const expiredSession = {
        id: 'session-1',
        refreshToken: 'expired-token',
        isActive: true,
        expiresAt: new Date(Date.now() - 100000), // Expirado
      };

      sessionsRepository.findOne.mockResolvedValue(expiredSession);
      sessionsRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        'Refresh token expirado',
      );
    });
  });

  // ============================================
  // LOGOUT
  // ============================================
  describe('logout', () => {
    it('should logout successfully', async () => {
      sessionsRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.logout('refresh-token');

      expect(result).toHaveProperty('message', 'Sesión cerrada correctamente');
      expect(sessionsRepository.update).toHaveBeenCalledWith(
        { refreshToken: 'refresh-token' },
        { isActive: false },
      );
    });
  });

  // ============================================
  // LOGOUT ALL
  // ============================================
  describe('logoutAll', () => {
    it('should logout all sessions for a user', async () => {
      sessionsRepository.update.mockResolvedValue({ affected: 3 });

      const result = await service.logoutAll('user-1');

      expect(result).toHaveProperty('message', 'Todas las sesiones cerradas');
      expect(sessionsRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1', isActive: true },
        { isActive: false },
      );
    });
  });

  // ============================================
  // VALIDATE USER
  // ============================================
  describe('validateUser', () => {
    it('should return user if active', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        isActive: true,
        roles: [],
      };

      usersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('user-1');

      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found or inactive', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('user-1');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // GET PROFILE
  // ============================================
  describe('getProfile', () => {
    it('should return user profile with permissions', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed',
        roles: [
          {
            id: 'role-1',
            name: 'admin',
            permissions: [
              { id: 'perm-1', name: 'users.create' },
              { id: 'perm-2', name: 'users.read' },
            ],
          },
        ],
      };

      usersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-1');

      expect(result).not.toHaveProperty('password');
      expect(result.permissions).toContain('users.create');
      expect(result.permissions).toContain('users.read');
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfile('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // GET SESSIONS
  // ============================================
  describe('getSessions', () => {
    it('should return active sessions for user', async () => {
      const mockSessions = [
        { id: 'session-1', userId: 'user-1', isActive: true },
        { id: 'session-2', userId: 'user-1', isActive: true },
      ];

      sessionsRepository.find.mockResolvedValue(mockSessions);

      const result = await service.getSessions('user-1');

      expect(result).toHaveLength(2);
      expect(sessionsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isActive: true },
        }),
      );
    });
  });
});