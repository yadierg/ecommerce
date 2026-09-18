// apps/admin-api/src/modules/settings/dto/bulk-update-settings.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsNotEmpty } from 'class-validator';

export class BulkUpdateSettingsDto {
  @ApiProperty({
    example: {
      site_name: 'Mi Ecommerce',
      currency: 'USD',
      tax_rate: 16,
    },
  })
  @IsObject()
  @IsNotEmpty()
  settings: Record<string, any>;
}