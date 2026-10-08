// apps/budget-api/src/modules/projects/dto/update-project.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';

export class UpdateProjectDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  siteAddress?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  siteCity?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  siteState?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  siteCountry?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  projectManagerId?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  estimatedEndDate?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  additionalCostsActual?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}