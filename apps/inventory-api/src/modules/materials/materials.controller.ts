// apps/inventory-api/src/modules/materials/materials.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Roles, CurrentUser } from '@ecommerce/auth';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';

@ApiTags('materials')
@Controller('materials')
export class MaterialsController {
  constructor(private readonly service: MaterialsService) {}

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
  @ApiOperation({ summary: 'Crear material' })
  create(
    @Body() dto: CreateMaterialDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.create(dto, tenantId);
  }

  // ============================================
  // LIST
  // ============================================
  @Get()
  @Roles(
    'super_admin',
    'admin',
    'inventory_manager',
    'store_manager',
    'budget_manager',
  )
  @ApiOperation({ summary: 'Listar materiales con filtros' })
  findAll(
    @Query() query: QueryMaterialDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.findAll(query, tenantId);
  }

  // ============================================
  // BY SKU
  // ============================================
  @Get('sku/:sku')
  @Roles('super_admin', 'admin', 'inventory_manager', 'store_manager')
  @ApiOperation({ summary: 'Buscar material por SKU' })
  @ApiParam({ name: 'sku', description: 'SKU del material' })
  findBySku(
    @Param('sku') sku: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.findBySku(sku, tenantId);
  }

  // ============================================
  // STATS
  // ============================================
  @Get('stats')
  @Roles('super_admin', 'admin', 'inventory_manager')
  @ApiOperation({ summary: 'Estadísticas de materiales' })
  getStats(
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.getStats(tenantId);
  }

  // ============================================
  // FIND ONE
  // ============================================
  @Get(':id')
  @Roles(
    'super_admin',
    'admin',
    'inventory_manager',
    'store_manager',
    'budget_manager',
  )
  @ApiOperation({ summary: 'Obtener material por ID' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.findOne(id, tenantId);
  }

  // ============================================
  // UPDATE
  // ============================================
  @Patch(':id')
  @Roles('super_admin', 'admin', 'inventory_manager')
  @ApiOperation({ summary: 'Actualizar material' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateMaterialDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.update(id, dto, tenantId);
  }

  // ============================================
  // TOGGLE ACTIVE
  // ============================================
  @Patch(':id/toggle-active')
  @Roles('super_admin', 'admin', 'inventory_manager')
  @ApiOperation({ summary: 'Activar/desactivar material' })
  toggleActive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.toggleActive(id, tenantId);
  }

  // ============================================
  // RECALCULATE COST (averageCost desde price_history)
  // ============================================
  @Post(':id/recalculate-cost')
  @Roles('super_admin', 'admin', 'inventory_manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recalcular costo promedio desde historial de precios',
  })
  recalculateCost(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.recalculateAverageCost(id, tenantId);
  }

  // ============================================
  // DELETE
  // ============================================
  @Delete(':id')
  @Roles('super_admin', 'admin', 'inventory_manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar material' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.remove(id, tenantId);
  }
}