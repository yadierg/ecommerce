// apps/budget-api/src/modules/claims/dto/resolve-claim.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class ResolveClaimDto {
  @ApiProperty({ example: 'Se reemplazó el panel sin costo' })
  @IsString()
  @IsNotEmpty()
  resolution: string;

  @ApiProperty({ required: false, default: 0, description: 'Costo cubierto por garantía' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  coveredCost?: number;

  @ApiProperty({ required: false, default: 0, description: 'Costo al cliente' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  customerCost?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}