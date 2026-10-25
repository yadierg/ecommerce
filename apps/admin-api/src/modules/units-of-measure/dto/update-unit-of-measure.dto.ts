import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUnitOfMeasureDto } from './create-unit-of-measure.dto';

export class UpdateUnitOfMeasureDto extends PartialType(
  OmitType(CreateUnitOfMeasureDto, ['abbreviation'] as const),
) {}