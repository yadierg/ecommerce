// apps/inventory-api/src/modules/attribute-definitions/dto/create-attribute-definition.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsInt,
  IsArray,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { AttributeDataType } from '@ecommerce/core';

export class CreateAttributeDefinitionDto {
  @ApiPropertyOptional({ example: 'uuid-product-type' })
  @IsUUID()
  @IsOptional()
  productTypeId?: string;

  @ApiProperty({ example: 'potencia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  key!: string;

  @ApiProperty({ example: 'Potencia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label!: string;

  @ApiPropertyOptional({ example: 'Power' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  labelEn?: string;

  @ApiProperty({ enum: AttributeDataType, default: AttributeDataType.STRING })
  @IsEnum(AttributeDataType)
  @IsOptional()
  dataType?: AttributeDataType;

  @ApiPropertyOptional({ example: 'W' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({ type: [String], example: ['MONO', 'POLY'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enumValues?: string[];

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isSearchable?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isFilterable?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(200)
  validationRegex?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  minValue?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxValue?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;
}