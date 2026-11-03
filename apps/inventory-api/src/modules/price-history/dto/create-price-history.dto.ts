// apps/inventory-api/src/modules/price-history/dto/create-price-history.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreatePriceHistoryDto {
  @ApiProperty({ example: 'uuid-material' })
  @IsUUID()
  materialId!: string;

  @ApiPropertyOptional({ example: 'uuid-supplier' })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ example: 'uuid-purchase-order' })
  @IsUUID()
  @IsOptional()
  purchaseOrderId?: string;

  @ApiProperty({ example: 1.5 })
  @IsNumber()
  @Min(0)
  unitCost!: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @ApiProperty({ example: '2026-10-15' })
  @IsDateString()
  purchaseDate!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}