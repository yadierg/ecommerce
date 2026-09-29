// apps/budget-api/src/modules/materials/dto/return-material.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ReturnMaterialDto {
  @ApiProperty({ example: 30, description: 'Cantidad devuelta' })
  @IsNumber()
  @Min(0.01)
  quantityReturned: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}