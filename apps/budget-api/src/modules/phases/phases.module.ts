// apps/budget-api/src/modules/phases/phases.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectPhase, Project, ProjectTask } from '@ecommerce/core';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectPhase, Project, ProjectTask])],
  controllers: [PhasesController],
  providers: [PhasesService],
  exports: [PhasesService],
})
export class PhasesModule {}