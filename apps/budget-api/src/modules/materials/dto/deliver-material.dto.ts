// apps/budget-api/src/modules/materials/dto/deliver-material.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DeliverMaterialDto {
  @ApiProperty({ description: 'Worker que recibe el material' })
  @IsUUID()
  workerId: string;

  @ApiProperty({ example: 100, description: 'Cantidad a entregar' })
  @IsNumber()
  @Min(0.01)
  quantityDelivered: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}