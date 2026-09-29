// apps/budget-api/src/modules/projects/dto/convert-budget-to-project.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PhaseDto {
  @ApiProperty({ example: 'Estudio del sitio' })
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 2, description: 'Días estimados' })
  @IsNumber()
  @Min(1)
  estimatedDays: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  order: number;
}

export class ConvertBudgetToProjectDto {
  @ApiProperty({ description: 'Worker ID del project manager (ingeniero)' })
  @IsUUID()
  projectManagerId: string;

  @ApiProperty({ example: '2026-10-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  estimatedEndDate?: string;

  @ApiProperty({ type: [PhaseDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhaseDto)
  @IsOptional()
  phases?: PhaseDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}