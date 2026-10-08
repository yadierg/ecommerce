// apps/budget-api/src/modules/claims/dto/reject-claim.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RejectClaimDto {
  @ApiProperty({ example: 'El daño fue causado por mal uso' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}