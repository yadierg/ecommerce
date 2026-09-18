// apps/admin-api/src/modules/audit/dto/query-audit-log.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAuditLogDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  entity?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiProperty({ required: false, example: '2026-01-01' })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiProperty({ required: false, example: '2026-12-31' })
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