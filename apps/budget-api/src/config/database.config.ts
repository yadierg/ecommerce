// apps/budget-api/src/config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  User,
  Role,
  Permission,
  Session,
  AuditLog,
  Setting,
  Notification,
  Tenant,
  Category,
  Product,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Warehouse,
  Stock,
  Movement,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
} from '@ecommerce/core';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get('DB_USER', 'ecommerce'),
  password: configService.get('DB_PASSWORD', 'dev123'),
  database: configService.get('DB_NAME', 'ecommerce_dev'),

  entities: [
    // Multi-tenant base
    Tenant,
    User,
    Role,
    Permission,
    Session,
    AuditLog,
    Setting,
    Notification,
    // Store
    Category,
    Product,
    Cart,
    CartItem,
    Order,
    OrderItem,
    // Inventory
    Warehouse,
    Stock,
    Movement,
    Supplier,
    PurchaseOrder,
    PurchaseOrderItem,
    // Budget (se agregará después)
  ],

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