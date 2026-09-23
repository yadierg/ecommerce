// apps/inventory-api/src/modules/purchase-orders/dto/receive-purchase-order.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ValidateNested,
  IsUUID,
  IsNumber,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveItemDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty({ example: 10, description: 'Cantidad recibida (puede ser menor)' })
  @IsNumber()
  @Min(0)
  quantityReceived: number;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ type: [ReceiveItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}