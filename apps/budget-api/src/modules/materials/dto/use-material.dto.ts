// apps/budget-api/src/modules/materials/dto/use-material.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UseMaterialDto {
  @ApiProperty({ example: 70, description: 'Cantidad usada' })
  @IsNumber()
  @Min(0)
  quantityUsed: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}