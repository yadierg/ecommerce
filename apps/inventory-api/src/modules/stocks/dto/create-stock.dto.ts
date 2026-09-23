// apps/inventory-api/src/modules/stocks/dto/create-stock.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateStockDto {
  @ApiProperty({ example: 'uuid-product' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 'uuid-warehouse' })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minStock?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxStock?: number;

  @ApiProperty({ required: false, example: 'A-1-3' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  shelf?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bin?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}