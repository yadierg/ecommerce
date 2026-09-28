// apps/budget-api/src/modules/budgets/dto/reject-budget.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RejectBudgetDto {
  @ApiProperty({ example: 'El cliente eligió otra oferta' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}