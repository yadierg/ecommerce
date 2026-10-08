// apps/inventory-api/src/modules/cronjobs/cronjobs.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from '@ecommerce/core';
import { InventoryApiCronjobsService } from './inventory-api-cronjobs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Stock])],
  providers: [InventoryApiCronjobsService],
})
export class CronjobsModule {}