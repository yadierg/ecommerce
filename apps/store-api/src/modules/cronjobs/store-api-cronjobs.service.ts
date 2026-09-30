// apps/store-api/src/modules/cronjobs/store-api-cronjobs.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cart, CartItem, Product } from '@ecommerce/core';

@Injectable()
export class StoreApiCronjobsService {
  private readonly logger = new Logger(StoreApiCronjobsService.name);

  constructor(
    @InjectRepository(Cart)
    private readonly cartsRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemsRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  // ============================================
  // 1. MARCAR CARRITOS ABANDONADOS (Diario 04:00)
  // ============================================
  @Cron('0 4 * * *', {
    name: 'mark-abandoned-carts',
    timeZone: 'America/Havana',
  })
  async markAbandonedCarts() {
    this.logger.log('🕐 [CRON] Marcando carritos abandonados...');

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await this.cartsRepository
        .createQueryBuilder()
        .update(Cart)
        .set({ status: 'abandoned' })
        .where('status = :status', { status: 'active' })
        .andWhere('updatedAt < :date', { date: sevenDaysAgo })
        .execute();

      const updated = result.affected || 0;
      this.logger.log(`✅ [CRON] ${updated} carrito(s) abandonado(s)`);
      return updated;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // 2. LIMPIAR CARRITOS ANTIGUOS (Semanal domingo 04:00)
  // ============================================
  @Cron('0 4 * * 0', {
    name: 'clean-old-carts',
    timeZone: 'America/Havana',
  })
  async cleanOldCarts() {
    this.logger.log('🕐 [CRON] Limpiando carritos > 30 días...');

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const oldCarts = await this.cartsRepository.find({
        where: {
          status: 'abandoned',
          updatedAt: LessThan(thirtyDaysAgo),
        },
      });

      if (oldCarts.length === 0) {
        this.logger.log('✅ [CRON] Sin carritos antiguos');
        return 0;
      }

      for (const cart of oldCarts) {
        await this.cartItemsRepository.delete({ cartId: cart.id });
      }

      await this.cartsRepository.remove(oldCarts);

      this.logger.log(`✅ [CRON] ${oldCarts.length} carrito(s) eliminado(s)`);
      return oldCarts.length;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // 3. VERIFICAR PRECIOS INVÁLIDOS (Semanal lunes 05:00)
  // ============================================
  @Cron('0 5 * * 1', {
    name: 'check-product-prices',
    timeZone: 'America/Havana',
  })
  async checkProductPrices() {
    this.logger.log('🕐 [CRON] Verificando precios inválidos...');

    try {
      const invalid = await this.productsRepository
        .createQueryBuilder('product')
        .where('product.comparePrice IS NOT NULL')
        .andWhere('product.comparePrice <= product.price')
        .getMany();

      if (invalid.length > 0) {
        this.logger.warn(
          `⚠️ [CRON] ${invalid.length} producto(s) con comparePrice <= price:`,
        );
        for (const p of invalid.slice(0, 10)) {
          this.logger.warn(
            `   • ${p.name}: price=$${p.price}, compare=$${p.comparePrice}`,
          );
        }
      } else {
        this.logger.log('✅ [CRON] Precios OK');
      }
      return invalid.length;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // 4. PRODUCTOS SIN STOCK (Diario 09:00)
  // ============================================
  @Cron('0 9 * * *', {
    name: 'notify-out-of-stock-products',
    timeZone: 'America/Havana',
  })
  async notifyProductsOutOfStock() {
    this.logger.log('🕐 [CRON] Productos sin stock...');

    try {
      const out = await this.productsRepository.find({
        where: { stock: 0, isActive: true },
      });

      if (out.length === 0) {
        this.logger.log('✅ [CRON] Sin productos agotados');
        return 0;
      }

      this.logger.warn(
        `⚠️ [CRON] ${out.length} producto(s) activos sin stock:`,
      );
      for (const p of out.slice(0, 20)) {
        this.logger.warn(`   • ${p.name} (SKU: ${p.sku})`);
      }
      if (out.length > 20) {
        this.logger.warn(`   ... y ${out.length - 20} más`);
      }
      return out.length;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }
}