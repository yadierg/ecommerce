// apps/admin-api/src/modules/tenants/dto/create-tenant.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'instel' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'Instel S.A.' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  taxId?: string;

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
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ default: 'basic', required: false })
  @IsString()
  @IsOptional()
  plan?: string;

  @ApiProperty({ default: 5, required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxUsers?: number;

  @ApiProperty({ default: 3, required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxWarehouses?: number;
}