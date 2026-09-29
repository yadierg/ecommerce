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
import { ProjectsModule } from '../modules/projects/projects.module';
import { PhasesModule } from '../modules/phases/phases.module';
import { TasksModule } from '../modules/tasks/tasks.module';
import { TimeLogsModule } from '../modules/timelogs/timelogs.module';
import { MaterialsModule } from '../modules/materials/materials.module';
import { InvoicesModule } from '../modules/invoices/invoices.module';
import { WarrantiesModule } from '../modules/warranties/warranties.module';
import { ClaimsModule } from '../modules/claims/claims.module';

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
    ProjectsModule,
    PhasesModule,
    TasksModule,
    TimeLogsModule,
    MaterialsModule,
    InvoicesModule,
    WarrantiesModule,
    ClaimsModule,
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