// apps/store-api/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

import { getDatabaseConfig } from '../config/database.config';
import {
  JwtAuthGuard,
  PermissionsGuard,
  AuthModule as SharedAuthModule,  // ← NUEVO
} from '@ecommerce/auth';

import { CategoriesModule } from '../modules/categories/categories.module';
import { ProductsModule } from '../modules/products/products.module';
import { CartModule } from '../modules/cart/cart.module';
import { OrdersModule } from '../modules/orders/orders.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // ============================================
    // CONFIGURACIÓN GLOBAL
    // ============================================
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      cache: true,
    }),

    // ============================================
    // TYPEORM - SOLO UNA CONEXIÓN
    // ============================================
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),

    // ============================================
    // AUTH COMPARTIDO (registra JwtStrategy)
    // ============================================
    SharedAuthModule,  // ← IMPORTANTE: Registrar JwtStrategy

    // ============================================
    // MÓDULOS DE LA APP
    // ============================================
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}