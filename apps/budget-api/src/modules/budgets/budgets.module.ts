// apps/budget-api/src/modules/budgets/budgets.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Budget,
  BudgetItem,
  BudgetLaborItem,
  Client,
  Warehouse,
  Product,
} from '@ecommerce/core';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Budget,
      BudgetItem,
      BudgetLaborItem,
      Client,
      Warehouse,
      Product,
    ]),
  ],
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}