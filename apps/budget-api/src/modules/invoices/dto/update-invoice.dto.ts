// apps/budget-api/src/modules/invoices/dto/update-invoice.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';
import { InvoicePaymentMethod } from '@ecommerce/core';

export class UpdateInvoiceDto {
  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  tax?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  additionalCosts?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  termsAndConditions?: string;
}