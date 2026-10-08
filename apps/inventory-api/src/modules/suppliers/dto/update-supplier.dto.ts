// apps/inventory-api/src/modules/suppliers/dto/update-supplier.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSupplierDto } from './create-supplier.dto';

export class UpdateSupplierDto extends PartialType(
  OmitType(CreateSupplierDto, ['code'] as const),
) {}