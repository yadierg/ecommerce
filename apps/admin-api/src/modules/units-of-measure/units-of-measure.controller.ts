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
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Roles, CurrentUser } from '@ecommerce/auth';
import { UnitsOfMeasureService } from './units-of-measure.service';
import { CreateUnitOfMeasureDto } from './dto/create-unit-of-measure.dto';
import { UpdateUnitOfMeasureDto } from './dto/update-unit-of-measure.dto';
import { QueryUnitOfMeasureDto } from './dto/query-unit-of-measure-dto';
import { UnitType } from '@ecommerce/core';

@ApiTags('units-of-measure')
@Controller('units-of-measure')
export class UnitsOfMeasureController {
  constructor(
    private readonly unitsService: UnitsOfMeasureService,
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
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Crear unidad de medida' })
  create(
    @Body() dto: CreateUnitOfMeasureDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('id') userId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.unitsService.create(dto, tenantId, userId);
  }

  // ============================================
  // LIST
  // ============================================
  @Get()
  @Roles('super_admin', 'admin', 'inventory_manager', 'store_manager', 'budget_manager')
  @ApiOperation({ summary: 'Listar unidades de medida' })
  findAll(
    @Query() query: QueryUnitOfMeasureDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.unitsService.findAll(query, tenantId);
  }

  // ============================================
  // ACTIVE (para dropdowns)
  // ============================================
  @Get('active')
  @Roles('super_admin', 'admin', 'inventory_manager', 'store_manager')
  @ApiOperation({ summary: 'Unidades activas (para dropdowns)' })
  findActive(
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.unitsService.findActive(tenantId);
  }

  // ============================================
  // BY TYPE
  // ============================================
  @Get('type/:type')
  @Roles('super_admin', 'admin', 'inventory_manager', 'store_manager')
  @ApiOperation({ summary: 'Unidades por tipo' })
  @ApiParam({ name: 'type', enum: UnitType })
  findByType(
    @Param('type') type: UnitType,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.unitsService.findByType(tenantId, type);
  }

  // ============================================
  // STATS
  // ============================================
  @Get('stats')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Estadísticas' })
  getStats(
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.unitsService.getStats(tenantId);
  }

  // ============================================
  // FIND ONE
  // ============================================
  @Get(':id')
  @Roles('super_admin', 'admin', 'inventory_manager', 'store_manager')
  @ApiOperation({ summary: 'Obtener unidad por ID' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.unitsService.findOne(id, tenantId);
  }

  // ============================================
  // UPDATE
  // ============================================
  @Patch(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Actualizar unidad' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUnitOfMeasureDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.unitsService.update(id, dto, tenantId);
  }

  // ============================================
  // TOGGLE ACTIVE
  // ============================================
  @Patch(':id/toggle-active')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Activar/desactivar unidad' })
  toggleActive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.unitsService.toggleActive(id, tenantId);
  }

  // ============================================
  // DELETE
  // ============================================
  @Delete(':id')
  @Roles('super_admin', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar unidad' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.unitsService.remove(id, tenantId);
  }
}