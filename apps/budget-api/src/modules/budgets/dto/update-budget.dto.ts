// apps/budget-api/src/modules/budgets/dto/update-budget.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateBudgetDto } from './create-budget.dto';

export class UpdateBudgetDto extends PartialType(
  OmitType(CreateBudgetDto, ['clientId', 'warehouseId'] as const),
) {}