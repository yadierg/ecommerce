// apps/budget-api/src/modules/clients/dto/update-client.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';

export class UpdateClientDto extends PartialType(CreateClientDto) {}