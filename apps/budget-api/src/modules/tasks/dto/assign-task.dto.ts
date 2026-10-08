// apps/budget-api/src/modules/tasks/dto/assign-task.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignTaskDto {
  @ApiProperty()
  @IsUUID()
  workerId: string;
}