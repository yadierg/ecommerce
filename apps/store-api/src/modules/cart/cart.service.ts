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
  async getOrCreateCart(userId?: string, sessionId?: string): Promise<Cart> {
    if (!userId && !sessionId) {
      throw new BadRequestException('Se requiere userId o sessionId');
    }

    let cart = await this.cartsRepository.findOne({
      where: userId
        ? { userId, status: 'active' }
        : { sessionId, status: 'active' },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      cart = this.cartsRepository.create({
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
    userId: string | undefined,
    sessionId: string | undefined,
    dto: AddToCartDto,
  ): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId, sessionId);

    // Verificar producto
    const product = await this.productsRepository.findOne({
      where: { id: dto.productId, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.stock < (dto.quantity || 1)) {
      throw new BadRequestException('Stock insuficiente');
    }

    // Verificar si ya está en el carrito
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

    return this.recalculate(cart.id);
  }

  // ============================================
  // ACTUALIZAR CANTIDAD
  // ============================================
  async updateItem(
    cartId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<Cart> {
    const item = await this.cartItemsRepository.findOne({
      where: { id: itemId, cartId },
      relations: ['product'],
    });

    if (!item) {
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

    return this.recalculate(cartId);
  }

  // ============================================
  // ELIMINAR ITEM
  // ============================================
  async removeItem(cartId: string, itemId: string): Promise<Cart> {
    const item = await this.cartItemsRepository.findOne({
      where: { id: itemId, cartId },
    });

    if (!item) {
      throw new NotFoundException('Item no encontrado');
    }

    await this.cartItemsRepository.remove(item);
    return this.recalculate(cartId);
  }

  // ============================================
  // VACIAR CARRITO
  // ============================================
  async clearCart(cartId: string): Promise<Cart> {
    await this.cartItemsRepository.delete({ cartId });
    return this.recalculate(cartId);
  }

  // ============================================
  // RECALCULAR TOTALES
  // ============================================
  private async recalculate(cartId: string): Promise<Cart> {
    const cart = await this.cartsRepository.findOne({
      where: { id: cartId },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      throw new NotFoundException('Carrito no encontrado');
    }

    cart.subtotal = (cart.items || []).reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    await this.cartsRepository.save(cart);
    return cart;
  }

  // ============================================
  // OBTENER CARRITO
  // ============================================
  async getCart(userId?: string, sessionId?: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId, sessionId);
    return this.recalculate(cart.id);
  }

  // ============================================
  // MERGE (cuando guest se registra)
  // ============================================
  async mergeCarts(sessionId: string, userId: string): Promise<Cart> {
    const guestCart = await this.cartsRepository.findOne({
      where: { sessionId, status: 'active' },
      relations: ['items'],
    });

    if (!guestCart) {
      return this.getOrCreateCart(userId);
    }

    const userCart = await this.getOrCreateCart(userId);

    // Mover items del guest cart al user cart
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

    // Marcar guest cart como convertido
    guestCart.status = 'converted';
    await this.cartsRepository.save(guestCart);

    return this.recalculate(userCart.id);
  }
}