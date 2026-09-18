// apps/admin-api/src/modules/permissions/dto/create-permission.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'products.create' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'products' })
  @IsString()
  @IsNotEmpty()
  resource: string;

  @ApiProperty({
    example: 'create',
    enum: ['create', 'read', 'update', 'delete', 'manage'],
  })
  @IsIn(['create', 'read', 'update', 'delete', 'manage'])
  action: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ default: 'custom', required: false })
  @IsString()
  @IsOptional()
  category?: string;
}