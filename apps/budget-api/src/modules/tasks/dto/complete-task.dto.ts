// apps/budget-api/src/modules/tasks/dto/complete-task.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CompleteTaskDto {
  @ApiProperty({ required: false, example: 8, description: 'Horas reales' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  actualHours?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}