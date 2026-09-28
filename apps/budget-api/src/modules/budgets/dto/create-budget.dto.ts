// apps/budget-api/src/modules/budgets/dto/create-budget.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  IsIn,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================
// MATERIALES
// ============================================
export class BudgetItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 999.99 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  taxRate?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

// ============================================
// MANO DE OBRA
// ============================================
export class BudgetLaborItemDto {
  @ApiProperty({ example: 'Instalación de 20 paneles solares' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'electricista' })
  @IsString()
  @IsNotEmpty()
  workerRole: string;

  @ApiProperty({ example: 2, description: 'Cantidad de personas' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 40, description: 'Horas estimadas por persona' })
  @IsNumber()
  @Min(0.5)
  estimatedHours: number;

  @ApiProperty({ example: 25, description: 'Tarifa por hora' })
  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

// ============================================
// PRESUPUESTO
// ============================================
export class CreateBudgetDto {
  // Cliente
  @ApiProperty()
  @IsUUID()
  clientId: string;

  // Almacén de origen
  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  // Proyecto
  @ApiProperty({ example: 'Instalación solar 10kW - Casa Pérez' })
  @IsString()
  @IsNotEmpty()
  projectTitle: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  projectDescription?: string;

  // Ubicación de la obra
  @ApiProperty({ example: 'Calle 123 #45-67, La Habana' })
  @IsString()
  @IsNotEmpty()
  siteAddress: string;

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

  // Fechas
  @ApiProperty({ required: false, example: '2026-09-23' })
  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @ApiProperty({ example: '2026-10-23' })
  @IsDateString()
  validUntil: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  estimatedStartDate?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  estimatedDurationDays?: number;

  // Totales manuales
  @ApiProperty({ required: false, default: 0, description: 'Gastos adicionales' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  additionalCosts?: number;

  @ApiProperty({ required: false, default: 0, description: 'Descuento total' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  // Comercial
  @ApiProperty({ required: false, default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  paymentTerms?: number;

  @ApiProperty({ required: false, default: 12 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  warrantyMonths?: number;

  // Extras
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  internalReference?: string;

  // Items
  @ApiProperty({ type: [BudgetItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto)
  @ArrayMinSize(1)
  items: BudgetItemDto[];

  @ApiProperty({ type: [BudgetLaborItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetLaborItemDto)
  @IsOptional()
  laborItems?: BudgetLaborItemDto[];
}