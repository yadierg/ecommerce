// apps/admin-api/src/modules/roles/dto/create-role.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'store_manager' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ default: 'custom', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Array de IDs de permisos',
    example: ['uuid-1', 'uuid-2'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[];
}