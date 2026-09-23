// apps/inventory-api/src/modules/stocks/stocks.controller.ts
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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  Public,
  CurrentUser,
  OptionalJwtGuard,
} from '@ecommerce/auth';
import { StocksService } from './stocks.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { QueryStockDto } from './dto/query-stock.dto';

@ApiTags('stocks')
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

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
  // CREATE / UPSERT
  // ============================================
  @Post()
  @ApiOperation({ summary: 'Crear/actualizar stock' })
  create(
    @Body() dto: CreateStockDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.stocksService.upsert(dto, tenantId);
  }

  // ============================================
  // READ ALL
  // ============================================
  @Public()
  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Listar stocks' })
  findAll(
    @Query() query: QueryStockDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.stocksService.findAll(query, tenantId);
  }

  // ============================================
  // LOW STOCK
  // ============================================
  @Public()
  @Get('low')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Productos con stock bajo' })
  findLowStock(
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.stocksService.findLowStock(tenantId);
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
    return this.stocksService.getStats(tenantId);
  }

  // ============================================
  // BY WAREHOUSE
  // ============================================
  @Public()
  @Get('warehouse/:warehouseId')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Stock por almacén' })
  findByWarehouse(
    @Param('warehouseId', new ParseUUIDPipe()) warehouseId: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.stocksService.findByWarehouse(warehouseId, tenantId);
  }

  // ============================================
  // BY PRODUCT
  // ============================================
  @Public()
  @Get('product/:productId')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Stock por producto' })
  findByProduct(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.stocksService.findByProduct(productId, tenantId);
  }

  // ============================================
  // BY ID
  // ============================================
  @Public()
  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Obtener por ID' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.stocksService.findOne(id, tenantId);
  }

  // ============================================
  // UPDATE
  // ============================================
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar stock' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.stocksService.update(id, dto, tenantId);
  }

  // ============================================
  // ADJUST
  // ============================================
  @Patch(':id/adjust')
  @ApiOperation({ summary: 'Ajustar cantidad (entrada/salida)' })
  adjust(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('id') userId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.stocksService.adjust(id, dto, tenantId, userId);
  }

  // ============================================
  // TRANSFER
  // ============================================
  @Post('transfer')
  @ApiOperation({ summary: 'Transferir entre almacenes' })
  transfer(
    @Body() dto: TransferStockDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.stocksService.transfer(dto, tenantId);
  }

  // ============================================
  // DELETE
  // ============================================
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar stock' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.stocksService.remove(id, tenantId);
  }
}