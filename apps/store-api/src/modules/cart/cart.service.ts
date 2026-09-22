// apps/store-api/src/modules/cart/cart.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, CartItem, Product } from '@ecommerce/core';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartsRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemsRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  // ============================================
  // OBTENER O CREAR CARRITO
  // ============================================
  async getOrCreateCart(
    tenantId: string,
    userId?: string | null,
    sessionId?: string | null,
  ): Promise<Cart> {
    if (!userId && !sessionId) {
      throw new BadRequestException(
        'Se requiere userId o sessionId para el carrito',
      );
    }

    // Buscar carrito activo del usuario/sesión en el mismo tenant
    const where: any = { tenantId, status: 'active' };
    if (userId) where.userId = userId;
    else where.sessionId = sessionId;

    let cart = await this.cartsRepository.findOne({
      where,
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      cart = this.cartsRepository.create({
        tenantId,
        userId: userId || null,
        sessionId: sessionId || null,
        status: 'active',
        items: [],
      });
      cart = await this.cartsRepository.save(cart);
    }

    return cart;
  }

  // ============================================
  // AGREGAR AL CARRITO
  // ============================================
  async addItem(
    tenantId: string,
    userId: string | null | undefined,
    sessionId: string | null | undefined,
    dto: AddToCartDto,
  ): Promise<Cart> {
    const cart = await this.getOrCreateCart(tenantId, userId, sessionId);

    // Verificar producto del mismo tenant
    const product = await this.productsRepository.findOne({
      where: { id: dto.productId, tenantId, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado en tu empresa');
    }

    if (product.stock < (dto.quantity || 1)) {
      throw new BadRequestException('Stock insuficiente');
    }

    const existingItem = cart.items?.find(
      (item) => item.productId === dto.productId,
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + (dto.quantity || 1);

      if (product.stock < newQuantity) {
        throw new BadRequestException('Stock insuficiente');
      }

      existingItem.quantity = newQuantity;
      await this.cartItemsRepository.save(existingItem);
    } else {
      const cartItem = this.cartItemsRepository.create({
        cartId: cart.id,
        productId: product.id,
        quantity: dto.quantity || 1,
        price: product.price,
        options: dto.options,
      });
      await this.cartItemsRepository.save(cartItem);
    }

    return this.recalculate(cart.id, tenantId);
  }

  // ============================================
  // ACTUALIZAR CANTIDAD
  // ============================================
  async updateItem(
    cartId: string,
    itemId: string,
    dto: UpdateCartItemDto,
    tenantId: string,
  ): Promise<Cart> {
    const item = await this.cartItemsRepository.findOne({
      where: { id: itemId, cartId },
      relations: ['product', 'cart'],
    });

    if (!item || item.cart.tenantId !== tenantId) {
      throw new NotFoundException('Item no encontrado');
    }

    if (dto.quantity === 0) {
      await this.cartItemsRepository.remove(item);
    } else {
      if (item.product.stock < dto.quantity) {
        throw new BadRequestException('Stock insuficiente');
      }
      item.quantity = dto.quantity;
      await this.cartItemsRepository.save(item);
    }

    return this.recalculate(cartId, tenantId);
  }

  // ============================================
  // ELIMINAR ITEM
  // ============================================
  async removeItem(cartId: string, itemId: string, tenantId: string): Promise<Cart> {
    const item = await this.cartItemsRepository.findOne({
      where: { id: itemId, cartId },
      relations: ['cart'],
    });

    if (!item || item.cart.tenantId !== tenantId) {
      throw new NotFoundException('Item no encontrado');
    }

    await this.cartItemsRepository.remove(item);
    return this.recalculate(cartId, tenantId);
  }

  // ============================================
  // VACIAR CARRITO
  // ============================================
  async clearCart(cartId: string, tenantId: string): Promise<Cart> {
    const cart = await this.cartsRepository.findOne({
      where: { id: cartId, tenantId },
    });

    if (!cart) {
      throw new NotFoundException('Carrito no encontrado');
    }

    await this.cartItemsRepository.delete({ cartId });
    return this.recalculate(cartId, tenantId);
  }

  // ============================================
  // RECALCULAR TOTALES
  // ============================================
  private async recalculate(cartId: string, tenantId: string): Promise<Cart> {
    const cart = await this.cartsRepository.findOne({
      where: { id: cartId, tenantId },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      throw new NotFoundException('Carrito no encontrado');
    }

    cart.subtotal = (cart.items || []).reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    );

    await this.cartsRepository.save(cart);
    return cart;
  }

  // ============================================
  // OBTENER CARRITO
  // ============================================
  async getCart(
    tenantId: string,
    userId?: string | null,
    sessionId?: string | null,
  ): Promise<Cart> {
    const cart = await this.getOrCreateCart(tenantId, userId, sessionId);
    return this.recalculate(cart.id, tenantId);
  }

  // ============================================
  // MERGE (guest → user al loguearse)
  // ============================================
  async mergeCarts(
    tenantId: string,
    sessionId: string,
    userId: string,
  ): Promise<Cart> {
    const guestCart = await this.cartsRepository.findOne({
      where: { tenantId, sessionId, status: 'active' },
      relations: ['items'],
    });

    if (!guestCart) {
      return this.getOrCreateCart(tenantId, userId);
    }

    const userCart = await this.getOrCreateCart(tenantId, userId);

    for (const item of guestCart.items || []) {
      const existing = userCart.items?.find(
        (i) => i.productId === item.productId,
      );

      if (existing) {
        existing.quantity += item.quantity;
        await this.cartItemsRepository.save(existing);
      } else {
        item.cartId = userCart.id;
        await this.cartItemsRepository.save(item);
      }
    }

    guestCart.status = 'converted';
    await this.cartsRepository.save(guestCart);

    return this.recalculate(userCart.id, tenantId);
  }
}