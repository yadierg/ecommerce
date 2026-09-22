// apps/admin-api/src/modules/users/dto/create-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['admin', 'user'], default: 'user', required: false })
  @IsEnum(['admin', 'user'])
  @IsOptional()
  role?: string;

  @ApiProperty({ required: false, description: 'ID del tenant' })
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isSuperAdmin?: boolean;
}