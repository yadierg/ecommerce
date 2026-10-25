// apps/inventory-api/src/modules/stocks/dto/initial-stock.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InitialStockItemDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 100, description: 'Cantidad inicial' })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({
    required: false,
    example: 25.5,
    description: 'Costo unitario estimado (opcional)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitCost?: number;

  @ApiProperty({
    required: false,
    example: 'Lote A-2024',
    description: 'Número de lote (si aplica)',
  })
  @IsString()
  @IsOptional()
  lotNumber?: string;

  @ApiProperty({
    required: false,
    example: 'A-1-3',
    description: 'Ubicación física en el almacén',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    required: false,
    example: '2024-01-15',
    description: 'Fecha estimada de adquisición',
  })
  @IsDateString()
  @IsOptional()
  estimatedAcquisitionDate?: string;

  @ApiProperty({
    required: false,
    example: 'Producto encontrado en inventario físico sin factura',
    description: 'Notas adicionales',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class InitialStockDto {
  @ApiProperty({ description: 'ID del almacén' })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({
    type: [InitialStockItemDto],
    description: 'Lista de productos a cargar',
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InitialStockItemDto)
  items: InitialStockItemDto[];

  @ApiProperty({
    required: false,
    example: 'Carga inicial de inventario - Almacén Central',
    description: 'Motivo/justificación de la carga',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}