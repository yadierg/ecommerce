// apps/inventory-api/src/modules/suppliers/dto/create-supplier.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEmail,
  Min,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Distribuidora Apple' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'PROV-001' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  contactPosition?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  paymentTerms?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  creditLimit?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isPreferred?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}