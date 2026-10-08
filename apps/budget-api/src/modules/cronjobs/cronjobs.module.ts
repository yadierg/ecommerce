// apps/budget-api/src/modules/cronjobs/cronjobs.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice, Warranty, Client, Project } from '@ecommerce/core';
import { BudgetApiCronjobsService } from './budget-api-cronjobs.service';
import { CronjobsTestController } from './cronjobs-test.controller';
import { InvoicesModule } from '../invoices/invoices.module';
import { WarrantiesModule } from '../warranties/warranties.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Warranty, Client, Project]),
    InvoicesModule,
    WarrantiesModule,
  ],
  controllers: [CronjobsTestController],
  providers: [BudgetApiCronjobsService],
})
export class CronjobsModule {}
