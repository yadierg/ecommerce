// apps/inventory-api/src/modules/stocks/dto/transfer-stock.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class TransferStockDto {
  @ApiProperty({ example: 'uuid-product' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 'uuid-warehouse-origen' })
  @IsUUID()
  fromWarehouseId: string;

  @ApiProperty({ example: 'uuid-warehouse-destino' })
  @IsUUID()
  toWarehouseId: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}