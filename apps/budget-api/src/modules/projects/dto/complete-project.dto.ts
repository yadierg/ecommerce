// apps/budget-api/src/modules/projects/dto/complete-project.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CompleteProjectDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  closeNotes?: string;
}