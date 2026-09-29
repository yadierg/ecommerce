// apps/budget-api/src/modules/timelogs/dto/create-time-log.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateTimeLogDto {
  @ApiProperty({ description: 'Worker ID' })
  @IsUUID()
  workerId: string;

  @ApiProperty({ required: false, description: 'Task ID' })
  @IsUUID()
  @IsOptional()
  taskId?: string;

  @ApiProperty({ example: '2026-10-20' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 8, description: 'Horas trabajadas' })
  @IsNumber()
  @Min(0.25)
  hours: number;

  @ApiProperty({ example: 'Instalación de paneles solares' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}