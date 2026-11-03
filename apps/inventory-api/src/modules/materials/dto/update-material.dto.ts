// apps/inventory-api/src/modules/materials/dto/update-material.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMaterialDto } from './create-material.dto';

export class UpdateMaterialDto extends PartialType(
  OmitType(CreateMaterialDto, ['sku'] as const),
) {}