// apps/budget-api/src/modules/claims/dto/create-claim.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClaimPriority } from '@ecommerce/core';

export class AffectedItemDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({ example: 'iPhone Instel' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'Pantalla rota' })
  @IsString()
  @IsNotEmpty()
  issue: string;
}

export class CreateClaimDto {
  @ApiProperty({ example: '2026-11-25' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({
    example: 'El panel deja de funcionar después de 2 semanas',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    enum: ClaimPriority,
    default: ClaimPriority.NORMAL,
    required: false,
  })
  @IsEnum(ClaimPriority)
  @IsOptional()
  priority?: ClaimPriority;

  @ApiProperty({ required: false, description: 'Worker asignado' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiProperty({ type: [AffectedItemDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AffectedItemDto)
  @IsOptional()
  affectedItems?: AffectedItemDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerNotes?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}