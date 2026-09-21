// apps/store-api/src/modules/products/dto/create-product.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsArray,
  Min,
  IsPositive,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, example: 'iphone-15-pro' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ example: 'IPH15PRO-256' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ required: false, example: 'El último iPhone...' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, example: 'Smartphone de alta gama' })
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiProperty({ example: 999.99 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ required: false, example: 1299.99 })
  @IsNumber()
  @IsOptional()
  comparePrice?: number;

  @ApiProperty({ required: false, example: 800.00 })
  @IsNumber()
  @IsOptional()
  costPrice?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiProperty({ required: false, default: 10 })
  @IsNumber()
  @IsOptional()
  lowStockThreshold?: number;

  @ApiProperty({ required: false, example: 'uuid-categoria' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ required: false, example: 'Apple' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  mainImage?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isDigital?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  metaDescription?: string;
}