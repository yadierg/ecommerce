// apps/budget-api/src/modules/invoices/dto/mark-as-paid.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { InvoicePaymentMethod } from '@ecommerce/core';

export class MarkAsPaidDto {
  @ApiProperty({ enum: InvoicePaymentMethod, required: false })
  @IsEnum(InvoicePaymentMethod)
  @IsOptional()
  paymentMethod?: InvoicePaymentMethod;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  paymentReference?: string;

  @ApiProperty({ required: false, example: '2026-11-25' })
  @IsDateString()
  @IsOptional()
  paidAt?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}