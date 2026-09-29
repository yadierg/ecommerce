// apps/budget-api/src/modules/timelogs/dto/query-time-log.dto.ts
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
import { TimeLogStatus } from '@ecommerce/core';

export class QueryTimeLogDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  workerId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  taskId?: string;

  @ApiProperty({ enum: TimeLogStatus, required: false })
  @IsEnum(TimeLogStatus)
  @IsOptional()
  status?: TimeLogStatus;

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