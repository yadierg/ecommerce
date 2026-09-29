// apps/budget-api/src/modules/warranties/warranties.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
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
import { WarrantiesService } from './warranties.service';
import { CreateWarrantyDto } from './dto/create-warranty.dto';
import { UpdateWarrantyDto } from './dto/update-warranty.dto';
import { QueryWarrantyDto } from './dto/query-warranty.dto';
import { VoidWarrantyDto } from './dto/void-warranty.dto';

@ApiTags('warranties')
@Controller('warranties')
export class WarrantiesController {
  constructor(private readonly warrantiesService: WarrantiesService) {}

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
  @ApiOperation({ summary: 'Crear garantía manualmente' })
  create(
    @Body() dto: CreateWarrantyDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('id') userId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.warrantiesService.create(dto, tenantId, userId);
  }

  // ============================================
  // CREATE FROM INVOICE
  // ============================================
  @Post('from-invoice/:invoiceId')
  @ApiOperation({ summary: 'Crear garantía desde factura pagada' })
  createFromInvoice(
    @Param('invoiceId', new ParseUUIDPipe()) invoiceId: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('id') userId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.warrantiesService.createFromInvoice(invoiceId, tenantId, userId);
  }

  // ============================================
  // READ ALL
  // ============================================
  @Public()
  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Listar garantías' })
  findAll(
    @Query() query: QueryWarrantyDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.warrantiesService.findAll(query, tenantId);
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
    return this.warrantiesService.getStats(tenantId);
  }

  // ============================================
  // CHECK EXPIRED
  // ============================================
  @Post('check-expired')
  @ApiOperation({ summary: 'Marcar garantías vencidas (cronjob)' })
  checkExpired(
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.warrantiesService
      .checkExpiredWarranties(tenantId)
      .then((count) => ({ updated: count }));
  }

  // ============================================
  // BY CLIENT
  // ============================================
  @Public()
  @Get('client/:clientId')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Garantías por cliente' })
  findByClient(
    @Param('clientId', new ParseUUIDPipe()) clientId: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.warrantiesService.findByClient(clientId, tenantId);
  }

  // ============================================
  // BY NUMBER
  // ============================================
  @Public()
  @Get('number/:warrantyNumber')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Buscar por número' })
  findByNumber(
    @Param('warrantyNumber') warrantyNumber: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.warrantiesService.findByNumber(warrantyNumber, tenantId);
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
    return this.warrantiesService.findOne(id, tenantId);
  }

  // ============================================
  // UPDATE
  // ============================================
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWarrantyDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.warrantiesService.update(id, dto, tenantId);
  }

  // ============================================
  // VOID
  // ============================================
  @Post(':id/void')
  @ApiOperation({ summary: 'Anular garantía' })
  void(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: VoidWarrantyDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.warrantiesService.void(id, dto.reason, tenantId);
  }

  // ============================================
  // RENEW
  // ============================================
  @Post(':id/renew')
  @ApiOperation({ summary: 'Renovar garantía' })
  renew(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('months') months: number,
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('id') userId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.warrantiesService.renew(id, months, tenantId, userId);
  }
}