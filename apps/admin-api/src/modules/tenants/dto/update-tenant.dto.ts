// apps/admin-api/src/modules/tenants/dto/update-tenant.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {}