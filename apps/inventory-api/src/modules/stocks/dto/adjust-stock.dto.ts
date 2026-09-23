// apps/inventory-api/src/modules/stocks/dto/adjust-stock.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({ example: 10, description: 'Positivo = entrada, Negativo = salida' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 'Ajuste por inventario físico' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}