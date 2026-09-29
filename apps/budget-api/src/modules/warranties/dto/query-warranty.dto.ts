// apps/budget-api/src/modules/warranties/dto/query-warranty.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WarrantyStatus } from '@ecommerce/core';

export class QueryWarrantyDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @ApiProperty({ enum: WarrantyStatus, required: false })
  @IsEnum(WarrantyStatus)
  @IsOptional()
  status?: WarrantyStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  to?: string;

  @ApiProperty({ required: false, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}