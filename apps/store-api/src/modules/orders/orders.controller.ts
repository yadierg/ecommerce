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
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public, CurrentUser } from '@ecommerce/auth';
import { OrderStatus, PaymentStatus } from '@ecommerce/core';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post('checkout')
  @ApiOperation({ summary: 'Finalizar compra (crear orden)' })
  checkout(
    @Body() dto: CreateOrderDto,
    @CurrentUser('id') userId?: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.ordersService.checkout(userId, sessionId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las órdenes (admin)' })
  findAll(@Query() query: QueryOrderDto) {
    return this.ordersService.findAll(query);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Mis órdenes' })
  findMyOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.findMyOrders(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas' })
  getStats() {
    return this.ordersService.getStats();
  }

  @Public()
  @Get('number/:orderNumber')
  @ApiOperation({ summary: 'Buscar por número de orden' })
  findByNumber(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.findByNumber(orderNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener orden por ID' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado' })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateStatus(id, status);
  }

  @Patch(':id/payment')
  @ApiOperation({ summary: 'Actualizar estado de pago' })
  updatePaymentStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('paymentStatus') paymentStatus: PaymentStatus,
  ) {
    return this.ordersService.updatePaymentStatus(id, paymentStatus);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar orden' })
  cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('reason') reason?: string,
  ) {
    return this.ordersService.cancel(id, reason);
  }
}