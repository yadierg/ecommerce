// apps/budget-api/src/modules/claims/dto/query-claim.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClaimStatus, ClaimPriority } from '@ecommerce/core';

export class QueryClaimDto {
  @ApiProperty({ enum: ClaimStatus, required: false })
  @IsEnum(ClaimStatus)
  @IsOptional()
  status?: ClaimStatus;

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