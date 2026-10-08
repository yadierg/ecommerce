// apps/budget-api/src/modules/timelogs/timelogs.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeLog, Project, ProjectTask, Worker } from '@ecommerce/core';
import { TimeLogsController } from './timelogs.controller';
import { TimeLogsService } from './timelogs.service';

@Module({
  imports: [TypeOrmModule.forFeature([TimeLog, Project, ProjectTask, Worker])],
  controllers: [TimeLogsController],
  providers: [TimeLogsService],
  exports: [TimeLogsService],
})
export class TimeLogsModule {}