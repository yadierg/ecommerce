// apps/budget-api/src/modules/timelogs/dto/reject-time-log.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RejectTimeLogDto {
  @ApiProperty({ example: 'Horas no corresponden con la tarea' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}