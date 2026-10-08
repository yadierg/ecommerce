// apps/store-api/src/modules/cronjobs/cronjobs.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart, CartItem, Product } from '@ecommerce/core';
import { StoreApiCronjobsService } from './store-api-cronjobs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem, Product])],
  providers: [StoreApiCronjobsService],
})
export class CronjobsModule {}