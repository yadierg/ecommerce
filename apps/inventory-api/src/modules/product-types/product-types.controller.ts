// apps/inventory-api/src/modules/product-types/product-types.controller.ts
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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles, CurrentUser } from '@ecommerce/auth';
import { ProductTypesService } from './product-types.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { QueryProductTypeDto } from './dto/query-product-type.dto';

@ApiTags('product-types')
@Controller('product-types')
export class ProductTypesController {
  constructor(private readonly service: ProductTypesService) {}

  private resolveTenantId(userTenantId?: string | null, headerTenantId?: string): string {
    const tenantId = userTenantId || headerTenantId;
    if (!tenantId) throw new BadRequestException('Tenant no especificado');
    return tenantId;
  }

  @Post()
  @Roles('super_admin', 'admin', 'inventory_manager')
  @ApiOperation({ summary: 'Crear tipo de producto' })
  create(
    @Body() dto: CreateProductTypeDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    return this.service.create(dto, this.resolveTenantId(userTenantId, headerTenantId));
  }

  @Get()
  @Roles('super_admin', 'admin', 'inventory_manager', 'store_manager', 'budget_manager')
  @ApiOperation({ summary: 'Listar tipos de producto' })
  findAll(
    @Query() query: QueryProductTypeDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    return this.service.findAll(query, this.resolveTenantId(userTenantId, headerTenantId));
  }

  @Get('active')
  @Roles('super_admin', 'admin', 'inventory_manager', 'store_manager', 'budget_manager')
  @ApiOperation({ summary: 'Tipos activos (dropdowns)' })
  findActive(
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    return this.service.findActive(this.resolveTenantId(userTenantId, headerTenantId));
  }

  @Get('category/:categoryId')
  @Roles('super_admin', 'admin', 'inventory_manager')
  @ApiOperation({ summary: 'Tipos por categoría' })
  findByCategory(
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    return this.service.findByCategory(categoryId, this.resolveTenantId(userTenantId, headerTenantId));
  }

  @Get('stats')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Estadísticas' })
  getStats(
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    return this.service.getStats(this.resolveTenantId(userTenantId, headerTenantId));
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'inventory_manager')
  @ApiOperation({ summary: 'Obtener tipo por ID' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    return this.service.findOne(id, this.resolveTenantId(userTenantId, headerTenantId));
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'inventory_manager')
  @ApiOperation({ summary: 'Actualizar tipo' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductTypeDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    return this.service.update(id, dto, this.resolveTenantId(userTenantId, headerTenantId));
  }

  @Delete(':id')
  @Roles('super_admin', 'admin', 'inventory_manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar tipo' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    return this.service.remove(id, this.resolveTenantId(userTenantId, headerTenantId));
  }
}