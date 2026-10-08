// apps/budget-api/src/modules/claims/dto/update-claim.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { ClaimPriority } from '@ecommerce/core';

export class UpdateClaimDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ClaimPriority, required: false })
  @IsEnum(ClaimPriority)
  @IsOptional()
  priority?: ClaimPriority;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerNotes?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}