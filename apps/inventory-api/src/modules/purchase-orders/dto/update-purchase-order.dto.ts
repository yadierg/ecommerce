// apps/inventory-api/src/modules/purchase-orders/dto/update-purchase-order.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';

export class UpdatePurchaseOrderDto extends PartialType(
  OmitType(CreatePurchaseOrderDto, ['supplierId', 'warehouseId'] as const),
) {}