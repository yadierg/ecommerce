// apps/inventory-api/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { getDatabaseConfig } from '../config/database.config';
import {
  JwtAuthGuard,
  PermissionsGuard,
  AuthModule as SharedAuthModule,
} from '@ecommerce/auth';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { WarehousesModule } from '../modules/warehouses/warehouses.module';
import { StocksModule } from '../modules/stocks/stocks.module';
import { MovementsModule } from '../modules/movements/movements.module';
import { SuppliersModule } from '../modules/suppliers/suppliers.module';
import { PurchaseOrdersModule } from '../modules/purchase-orders/purchase-orders.module';
import { CronjobsModule } from '../modules/cronjobs/cronjobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      cache: true,
    }),

    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),

    SharedAuthModule,

    WarehousesModule,
    StocksModule,
    MovementsModule,
    SuppliersModule,
    PurchaseOrdersModule,

    CronjobsModule,
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
