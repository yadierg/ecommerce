// apps/budget-api/src/modules/warranties/dto/void-warranty.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VoidWarrantyDto {
  @ApiProperty({ example: 'Cliente no cumplió con mantenimiento' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}