// apps/budget-api/src/modules/warranties/dto/create-warranty.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CoveredItemDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty()
  @IsString()
  productName: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  productSku?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsDateString()
  installedAt: string;

  @ApiProperty({ example: 24 })
  @IsNumber()
  @Min(1)
  warrantyMonths: number;

  @ApiProperty()
  @IsDateString()
  specificEndDate: string;
}

export class CreateWarrantyDto {
  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  invoiceId?: string;

  @ApiProperty({ example: 24, description: 'Meses de garantía' })
  @IsNumber()
  @Min(1)
  monthsDuration: number;

  @ApiProperty({ required: false, example: '2026-11-25' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ type: [CoveredItemDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoveredItemDto)
  @IsOptional()
  coveredItems?: CoveredItemDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  terms?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}