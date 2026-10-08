// apps/inventory-api/src/modules/stocks/dto/query-stock.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsBoolean, IsNumber, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryStockDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  lowStock?: boolean;

  @ApiProperty({ required: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  outOfStock?: boolean;

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