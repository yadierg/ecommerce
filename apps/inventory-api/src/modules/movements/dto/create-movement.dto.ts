// apps/inventory-api/src/modules/movements/dto/create-movement.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { MovementType } from '@ecommerce/core';

export class CreateMovementDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ enum: MovementType })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty({ example: -5 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  referenceId?: string;
}