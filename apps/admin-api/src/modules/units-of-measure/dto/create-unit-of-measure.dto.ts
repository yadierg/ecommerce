import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { UnitType } from '@ecommerce/core';

export class CreateUnitOfMeasureDto {
  @ApiProperty({ example: 'Metro' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'm' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  abbreviation: string;

  @ApiProperty({ required: false, example: 'Meter' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  nameEn?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: UnitType,
    default: UnitType.UNIT,
    required: false,
  })
  @IsEnum(UnitType)
  @IsOptional()
  type?: UnitType;

  @ApiProperty({
    default: 0,
    required: false,
    description: 'Decimales permitidos (0-4)',
  })
  @IsInt()
  @Min(0)
  @Max(4)
  @IsOptional()
  decimalPlaces?: number;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}