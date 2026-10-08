// apps/inventory-api/src/modules/movements/dto/query-movement.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MovementType } from '@ecommerce/core';

export class QueryMovementDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({ enum: MovementType, required: false })
  @IsEnum(MovementType)
  @IsOptional()
  type?: MovementType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  referenceId?: string;

  @ApiProperty({ required: false, example: '2026-01-01' })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiProperty({ required: false, example: '2026-12-31' })
  @IsString()
  @IsOptional()
  to?: string;

  @ApiProperty({ required: false, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}