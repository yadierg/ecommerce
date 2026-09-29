// apps/budget-api/src/modules/projects/projects.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Project,
  ProjectPhase,
  ProjectMaterial,
  ProjectTask,
  TimeLog,
  Budget,
  Worker,
} from '@ecommerce/core';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectPhase,
      ProjectMaterial,
      ProjectTask,
      TimeLog,
      Budget,
      Worker,
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}