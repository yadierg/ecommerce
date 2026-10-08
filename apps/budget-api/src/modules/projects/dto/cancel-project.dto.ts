// apps/budget-api/src/modules/projects/dto/cancel-project.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CancelProjectDto {
  @ApiProperty({ example: 'Cliente canceló la obra' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}