// apps/budget-api/src/modules/phases/dto/create-phase.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class CreatePhaseDto {
  @ApiProperty({ example: 'Montaje de estructura' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  order: number;

  @ApiProperty({ required: false, example: 3, description: 'Días estimados' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  estimatedDays?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}