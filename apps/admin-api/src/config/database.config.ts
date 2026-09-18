// apps/admin-api/src/config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { Setting } from '../entities/setting.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { Session } from '../entities/session.entity';
import { Notification } from '../entities/notification.entity';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get('DB_USER', 'ecommerce'),
  password: configService.get('DB_PASSWORD', 'dev123'),
  database: configService.get('DB_NAME', 'ecommerce_dev'),

  entities: [User, AuditLog, Setting, Role, Permission, Session, Notification],

  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',

  synchronize: configService.get('NODE_ENV') === 'development',

  logging: configService.get('NODE_ENV') === 'development' ? 'all' : ['error'],

  ssl: configService.get('NODE_ENV') === 'production'
    ? { rejectUnauthorized: false }
    : false,

  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
  },
});