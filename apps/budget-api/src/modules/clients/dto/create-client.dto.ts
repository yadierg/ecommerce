// apps/budget-api/src/modules/clients/dto/create-client.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsNumber,
  IsIn,
  Min,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  company?: string;

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
  phoneAlt?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  idNumber?: string;

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

  @ApiProperty({
    enum: ['individual', 'business', 'government'],
    default: 'individual',
    required: false,
  })
  @IsIn(['individual', 'business', 'government'])
  @IsOptional()
  type?: string;

  @ApiProperty({
    enum: ['residential', 'commercial', 'industrial'],
    required: false,
  })
  @IsIn(['residential', 'commercial', 'industrial'])
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  creditLimit?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  paymentTerms?: number;

  @ApiProperty({ required: false, default: 'USD' })
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
  isVip?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}