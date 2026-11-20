import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ValidateNested,
  IsUUID,
  IsInt,
  Min,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InitialStockItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 10, description: 'Cantidad (entero)' })
  @IsInt()                // 👈 FIX: rechaza decimales
  @Min(0)
  quantity: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  lotNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  estimatedAcquisitionDate?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  unitCost?: number;
}

export class InitialStockDto {
  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ type: [InitialStockItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialStockItemDto)
  items: InitialStockItemDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}