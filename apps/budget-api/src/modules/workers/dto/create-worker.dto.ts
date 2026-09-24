// apps/budget-api/src/modules/workers/dto/create-worker.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsNumber,
  IsArray,
  IsIn,
  Min,
  IsUUID,
} from 'class-validator';

export class CreateWorkerDto {
  @ApiProperty({ example: 'Carlos Electricista' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  idNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  emergencyPhone?: string;

  @ApiProperty({
    enum: ['electricista', 'ingeniero', 'tecnico', 'ayudante', 'soldador', 'supervisor'],
  })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ required: false, example: 'Ingeniero Eléctrico Senior' })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialties?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  certifications?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  yearsExperience?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyRate?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlySalary?: number;

  @ApiProperty({ required: false, default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    enum: ['hourly', 'daily', 'monthly', 'project'],
    default: 'hourly',
    required: false,
  })
  @IsIn(['hourly', 'daily', 'monthly', 'project'])
  @IsOptional()
  paymentType?: string;

  @ApiProperty({ required: false, default: 40 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  weeklyHours?: number;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  hireDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}