// apps/budget-api/src/modules/tasks/dto/create-task.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';
import { TaskPriority } from '@ecommerce/core';

export class CreateTaskDto {
  @ApiProperty({ example: 'Instalar 20 paneles en techo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, description: 'ID de la fase' })
  @IsUUID()
  @IsOptional()
  phaseId?: string;

  @ApiProperty({ required: false, description: 'Worker asignado' })
  @IsUUID()
  @IsOptional()
  workerId?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  order?: number;

  @ApiProperty({ enum: TaskPriority, default: TaskPriority.NORMAL, required: false })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiProperty({ example: 8, description: 'Horas estimadas' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedHours?: number;

  @ApiProperty({ required: false, example: '2026-10-20' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}