// apps/store-api/src/modules/cart/cart.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('cart')
@Controller('cart')
@Public()  // ← Todo el controller es público (guest puede comprar)
@UseGuards(OptionalJwtGuard)  // ← Pero procesa JWT si está
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Resolver tenantId:
   * 1. Del JWT (user autenticado)
   * 2. Del header `x-tenant-id` (guest)
   * 3. Error si ninguno
   */
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

  @Get()
  @ApiOperation({ summary: 'Obtener carrito actual' })
  getCart(
    @CurrentUser('id') userId: string | null,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-session-id') sessionId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.cartService.getCart(tenantId, userId, sessionId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Agregar producto al carrito' })
  addItem(
    @Body() dto: AddToCartDto,
    @CurrentUser('id') userId: string | null,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-session-id') sessionId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.cartService.addItem(tenantId, userId, sessionId, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Actualizar cantidad' })
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser('id') userId: string | null,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-session-id') sessionId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.cartService
      .getOrCreateCart(tenantId, userId, sessionId)
      .then((cart) => this.cartService.updateItem(cart.id, itemId, dto, tenantId));
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Eliminar item' })
  removeItem(
    @Param('itemId') itemId: string,
    @CurrentUser('id') userId: string | null,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-session-id') sessionId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.cartService
      .getOrCreateCart(tenantId, userId, sessionId)
      .then((cart) => this.cartService.removeItem(cart.id, itemId, tenantId));
  }

  @Delete()
  @ApiOperation({ summary: 'Vaciar carrito' })
  clearCart(
    @CurrentUser('id') userId: string | null,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-session-id') sessionId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.cartService
      .getOrCreateCart(tenantId, userId, sessionId)
      .then((cart) => this.cartService.clearCart(cart.id, tenantId));
  }
}