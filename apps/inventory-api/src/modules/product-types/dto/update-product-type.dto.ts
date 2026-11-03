// apps/inventory-api/src/modules/product-types/dto/update-product-type.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductTypeDto } from './create-product-type.dto';

export class UpdateProductTypeDto extends PartialType(
  OmitType(CreateProductTypeDto, ['code'] as const),
) {}