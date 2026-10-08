// apps/admin-api/src/modules/cronjobs/cronjobs.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, Session, Tenant, User } from '@ecommerce/core';
import { AdminApiCronjobsService } from './admin-api-cronjobs.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, Session, Tenant, User]),
    AuditModule,
  ],
  providers: [AdminApiCronjobsService],
})
export class CronjobsModule {}