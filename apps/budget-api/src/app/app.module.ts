// apps/budget-api/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

import { getDatabaseConfig } from '../config/database.config';
import {
  JwtAuthGuard,
  PermissionsGuard,
  AuthModule as SharedAuthModule,
} from '@ecommerce/auth';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ClientsModule } from '../modules/clients/clients.module';
import { WorkersModule } from '../modules/workers/workers.module';
import { BudgetsModule } from '../modules/budgets/budgets.module';

@Module({
  imports: [
    // ============================================
    // CONFIGURACIÓN GLOBAL (IMPRESCINDIBLE)
    // ============================================
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      cache: true,
    }),

    // ============================================
    // TYPEORM
    // ============================================
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),

    // ============================================
    // AUTH COMPARTIDO
    // ============================================
    SharedAuthModule,
    ClientsModule,
    WorkersModule,
    BudgetsModule,
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