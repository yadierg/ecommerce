// apps/admin-api/src/modules/settings/dto/update-setting.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSettingDto } from './create-setting.dto';

export class UpdateSettingDto extends PartialType(
  OmitType(CreateSettingDto, ['key'] as const),
) {}