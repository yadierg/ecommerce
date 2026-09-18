// apps/admin-api/src/modules/auth/dto/register.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
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

  @ApiProperty({ required: false, example: 'user' })
  @IsString()
  @IsOptional()
  role?: string;
}