// apps/inventory-api/src/modules/attribute-definitions/dto/update-attribute-definition.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAttributeDefinitionDto } from './create-attribute-definition.dto';

export class UpdateAttributeDefinitionDto extends PartialType(
  OmitType(CreateAttributeDefinitionDto, ['key'] as const),
) {}