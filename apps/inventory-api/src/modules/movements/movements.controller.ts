// apps/inventory-api/src/modules/movements/movements.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Headers,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  Public,
  CurrentUser,
  OptionalJwtGuard,
} from '@ecommerce/auth';
import { MovementsService } from './movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { QueryMovementDto } from './dto/query-movement.dto';

@ApiTags('movements')
@Controller('movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

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
  // CREATE (manual)
  // ============================================
  @Post()
  @ApiOperation({ summary: 'Crear movimiento manual' })
  create(
    @Body() dto: CreateMovementDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('id') userId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.movementsService.create(dto, tenantId, userId);
  }

  // ============================================
  // READ ALL
  // ============================================
  @Public()
  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Listar movimientos' })
  findAll(
    @Query() query: QueryMovementDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.movementsService.findAll(query, tenantId);
  }

  // ============================================
  // STATS
  // ============================================
  @Public()
  @Get('stats')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Estadísticas' })
  getStats(
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.movementsService.getStats(tenantId);
  }

  // ============================================
  // BY PRODUCT
  // ============================================
  @Public()
  @Get('product/:productId')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Movimientos de un producto' })
  findByProduct(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.movementsService.findByProduct(productId, tenantId);
  }

  // ============================================
  // BY WAREHOUSE
  // ============================================
  @Public()
  @Get('warehouse/:warehouseId')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Movimientos de un almacén' })
  findByWarehouse(
    @Param('warehouseId', new ParseUUIDPipe()) warehouseId: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.movementsService.findByWarehouse(warehouseId, tenantId);
  }

  // ============================================
  // BY ID
  // ============================================
  @Public()
  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Detalle' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.movementsService.findOne(id, tenantId);
  }
}