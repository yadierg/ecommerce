// apps/budget-api/src/modules/materials/dto/report-lost.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';

export class ReportLostDto {
  @ApiProperty({ example: 5, description: 'Cantidad perdida/dañada' })
  @IsNumber()
  @Min(0.01)
  quantityLost: number;

  @ApiProperty({ example: 'Cable cortado en tramos pequeños' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}