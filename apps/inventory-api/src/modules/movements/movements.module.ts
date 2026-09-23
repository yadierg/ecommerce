// apps/inventory-api/src/modules/movements/movements.module.ts
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movement, Stock, Product, Warehouse } from '@ecommerce/core';
import { MovementsController } from './movements.controller';
import { MovementsService } from './movements.service';

@Global() // ← Global para usarlo desde otros módulos
@Module({
  imports: [TypeOrmModule.forFeature([Movement, Stock, Product, Warehouse])],
  controllers: [MovementsController],
  providers: [MovementsService],
  exports: [MovementsService],
})
export class MovementsModule {}