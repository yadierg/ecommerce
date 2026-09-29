// apps/budget-api/src/modules/materials/materials.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ProjectMaterial,
  Project,
  Stock,
  Movement,
  Worker,
} from '@ecommerce/core';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectMaterial,
      Project,
      Stock,
      Movement,
      Worker,
    ]),
  ],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}