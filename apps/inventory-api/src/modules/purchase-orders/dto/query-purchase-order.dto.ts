// apps/inventory-api/src/modules/purchase-orders/dto/query-purchase-order.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseOrderStatus } from '@ecommerce/core';

export class QueryPurchaseOrderDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @ApiProperty({ enum: PurchaseOrderStatus, required: false })
  @IsEnum(PurchaseOrderStatus)
  @IsOptional()
  status?: PurchaseOrderStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiProperty({ required: false })
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