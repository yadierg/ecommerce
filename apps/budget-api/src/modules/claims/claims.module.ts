// apps/budget-api/src/modules/claims/claims.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarrantyClaim, Warranty, Worker } from '@ecommerce/core';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';

@Module({
  imports: [TypeOrmModule.forFeature([WarrantyClaim, Warranty, Worker])],
  controllers: [ClaimsController],
  providers: [ClaimsService],
  exports: [ClaimsService],
})
export class ClaimsModule {}