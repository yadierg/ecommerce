// apps/budget-api/src/modules/workers/dto/update-worker.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateWorkerDto } from './create-worker.dto';

export class UpdateWorkerDto extends PartialType(CreateWorkerDto) {}