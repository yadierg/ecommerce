// apps/budget-api/src/modules/phases/dto/update-phase.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreatePhaseDto } from './create-phase.dto';

export class UpdatePhaseDto extends PartialType(CreatePhaseDto) {}