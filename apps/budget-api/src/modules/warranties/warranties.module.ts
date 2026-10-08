// apps/budget-api/src/modules/warranties/warranties.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Warranty,
  WarrantyClaim,
  Project,
  ProjectMaterial,
  Invoice,
  Budget,
  Client,
} from '@ecommerce/core';
import { WarrantiesController } from './warranties.controller';
import { WarrantiesService } from './warranties.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Warranty,
      WarrantyClaim,
      Project,
      ProjectMaterial,
      Invoice,
      Budget,
      Client,
    ]),
  ],
  controllers: [WarrantiesController],
  providers: [WarrantiesService],
  exports: [WarrantiesService],
})
export class WarrantiesModule {}