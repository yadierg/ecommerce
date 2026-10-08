// apps/inventory-api/src/modules/warehouses/dto/update-warehouse.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateWarehouseDto } from './create-warehouse.dto';

export class UpdateWarehouseDto extends PartialType(
  OmitType(CreateWarehouseDto, ['code'] as const),
) {}