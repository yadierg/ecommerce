// apps/inventory-api/src/modules/price-history/price-history.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Roles, CurrentUser } from '@ecommerce/auth';
import { PriceHistoryService } from './price-history.service';
import { CreatePriceHistoryDto } from './dto/create-price-history.dto';

@ApiTags('price-history')
@Controller('price-history')
export class PriceHistoryController {
  constructor(
    private readonly service: PriceHistoryService,
  ) {}

  private resolveTenantId(
    userTenantId?: string | null,
    headerTenantId?: string,
  ): string {
    const tenantId = userTenantId || headerTenantId;
    if (!tenantId) {
      throw new BadRequestException(
        'Tenant no especificado. Envía el header "x-tenant-id" o autentícate.',
      );
    }
    return tenantId;
  }

  // ============================================
  // CREATE
  // ============================================
  @Post()
  @Roles('super_admin', 'admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Registrar precio de compra (recalcula averageCost)',
  })
  create(
    @Body() dto: CreatePriceHistoryDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.create(dto, tenantId);
  }

  // ============================================
  // BY MATERIAL
  // ============================================
  @Get('material/:materialId')
  @Roles('super_admin', 'admin', 'inventory_manager', 'budget_manager')
  @ApiOperation({ summary: 'Historial de precios de un material' })
  @ApiParam({ name: 'materialId', description: 'UUID del material' })
  findByMaterial(
    @Param('materialId', new ParseUUIDPipe()) materialId: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.findByMaterial(materialId, tenantId);
  }

  // ============================================
  // STATS (min/max/avg/count)
  // ============================================
  @Get('material/:materialId/stats')
  @Roles('super_admin', 'admin', 'inventory_manager', 'budget_manager')
  @ApiOperation({
    summary: 'Estadísticas de precios (min, max, avg, count)',
  })
  @ApiParam({ name: 'materialId', description: 'UUID del material' })
  getStats(
    @Param('materialId', new ParseUUIDPipe()) materialId: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.getStats(materialId, tenantId);
  }

  // ============================================
  // DELETE
  // ============================================
  @Delete(':id')
  @Roles('super_admin', 'admin', 'inventory_manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar registro de precio (recalcula averageCost)',
  })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.remove(id, tenantId);
  }
}