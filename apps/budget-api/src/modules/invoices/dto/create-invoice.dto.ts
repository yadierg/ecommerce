// apps/budget-api/src/modules/invoices/dto/create-invoice.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';
import { InvoicePaymentMethod } from '@ecommerce/core';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Project ID completado' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ required: false, example: '2026-11-20' })
  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @ApiProperty({ required: false, example: '2026-12-20' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  tax?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiProperty({ required: false, default: 30 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  paymentTerms?: number;

  @ApiProperty({ required: false, default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  termsAndConditions?: string;
}