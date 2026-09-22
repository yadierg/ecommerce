// apps/admin-api/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { getDatabaseConfig } from '../config/database.config';

import { UsersModule } from '../modules/users/users.module';
import { AuditModule } from '../modules/audit/audit.module';
import { SettingsModule } from '../modules/settings/settings.module';
import { RolesModule } from '../modules/roles/roles.module';
import { PermissionsModule } from '../modules/permissions/permissions.module';
import { AuthModule } from '../modules/auth/auth.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { TenantsModule } from '../modules/tenants/tenants.module';

import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { JwtAuthGuard, PermissionsGuard } from '@ecommerce/auth';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      cache: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),

    AuthModule,
    UsersModule,
    AuditModule,
    SettingsModule,
    RolesModule,
    PermissionsModule,
    NotificationsModule,
    TenantsModule,
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
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}