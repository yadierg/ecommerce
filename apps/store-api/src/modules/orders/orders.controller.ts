// apps/store-api/src/modules/orders/orders.controller.ts
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
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  Public,
  CurrentUser,
  OptionalJwtGuard,
} from '@ecommerce/auth';
import { OrderStatus, PaymentStatus } from '@ecommerce/core';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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
  // CHECKOUT - Público (guest puede comprar)
  // ============================================
  @Public()
  @UseGuards(OptionalJwtGuard)
  @Post('checkout')
  @ApiOperation({ summary: 'Finalizar compra' })
  checkout(
    @Body() dto: CreateOrderDto,
    @CurrentUser('id') userId: string | null,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-session-id') sessionId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.ordersService.checkout(tenantId, userId, sessionId, dto);
  }

  // ============================================
  // ADMIN - Listar todas
  // ============================================
  @Get()
  @ApiOperation({ summary: 'Listar órdenes (admin)' })
  findAll(
    @Query() query: QueryOrderDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.ordersService.findAll(query, tenantId);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Mis pedidos' })
  findMyOrders(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.ordersService.findMyOrders(userId, tenantId);
  }

  @Public()
  @UseGuards(OptionalJwtGuard)
  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas' })
  getStats(
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.ordersService.getStats(tenantId);
  }

  // ============================================
  // Público: buscar por número
  // ============================================
  @Public()
  @UseGuards(OptionalJwtGuard)
  @Get('number/:orderNumber')
  @ApiOperation({ summary: 'Buscar por número' })
  findByNumber(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.ordersService.findByNumber(orderNumber, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Por ID' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.ordersService.findOne(id, tenantId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado' })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('status') status: OrderStatus,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.ordersService.updateStatus(id, status, tenantId);
  }

  @Patch(':id/payment')
  @ApiOperation({ summary: 'Actualizar pago' })
  updatePaymentStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('paymentStatus') paymentStatus: PaymentStatus,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.ordersService.updatePaymentStatus(id, paymentStatus, tenantId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar orden' })
  cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('reason') reason: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.ordersService.cancel(id, tenantId, reason);
  }
}