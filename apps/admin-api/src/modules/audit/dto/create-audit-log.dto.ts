// apps/admin-api/src/modules/audit/dto/create-audit-log.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsNumber } from 'class-validator';

export class CreateAuditLogDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ example: 'create' })
  @IsString()
  action: string;

  @ApiProperty({ example: 'user' })
  @IsString()
  entity: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiProperty({ required: false, type: Object })
  @IsObject()
  @IsOptional()
  changes?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  statusCode?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  durationMs?: number;
}