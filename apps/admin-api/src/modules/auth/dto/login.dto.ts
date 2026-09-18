// apps/admin-api/src/modules/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@ejemplo.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}