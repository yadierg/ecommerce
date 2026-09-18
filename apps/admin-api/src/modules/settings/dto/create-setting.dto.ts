// apps/admin-api/src/modules/settings/dto/create-setting.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class CreateSettingDto {
  @ApiProperty({ example: 'site_name' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'Mi Ecommerce' })
  value: any;

  @ApiProperty({ example: 'general' })
  @IsString()
  @IsNotEmpty()
  group: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: ['string', 'number', 'boolean', 'json', 'array'],
    default: 'string',
    required: false,
  })
  @IsIn(['string', 'number', 'boolean', 'json', 'array'])
  @IsOptional()
  type?: string;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  isEditable?: boolean;
}