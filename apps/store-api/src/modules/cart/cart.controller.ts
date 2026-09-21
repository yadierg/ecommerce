// apps/store-api/src/modules/cart/cart.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { Public, CurrentUser } from '@ecommerce/auth';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Obtener carrito actual' })
  getCart(
    @CurrentUser('id') userId?: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.getCart(userId, sessionId);
  }

  @Public()
  @Post('items')
  @ApiOperation({ summary: 'Agregar producto al carrito' })
  addItem(
    @Body() dto: AddToCartDto,
    @CurrentUser('id') userId?: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.addItem(userId, sessionId, dto);
  }

  @Public()
  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Actualizar cantidad' })
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser('id') userId?: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService
      .getOrCreateCart(userId, sessionId)
      .then((cart) => this.cartService.updateItem(cart.id, itemId, dto));
  }

  @Public()
  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Eliminar item' })
  removeItem(
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId?: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService
      .getOrCreateCart(userId, sessionId)
      .then((cart) => this.cartService.removeItem(cart.id, itemId));
  }

  @Public()
  @Delete()
  @ApiOperation({ summary: 'Vaciar carrito' })
  clearCart(
    @CurrentUser('id') userId?: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService
      .getOrCreateCart(userId, sessionId)
      .then((cart) => this.cartService.clearCart(cart.id));
  }
}