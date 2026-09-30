// apps/inventory-api/src/modules/cronjobs/inventory-api-cronjobs.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from '@ecommerce/core';

@Injectable()
export class InventoryApiCronjobsService {
  private readonly logger = new Logger(InventoryApiCronjobsService.name);

  constructor(
    @InjectRepository(Stock)
    private readonly stocksRepository: Repository<Stock>,
  ) {}

  // ============================================
  // 1. NOTIFICAR STOCK BAJO (Diario 08:00)
  // ============================================
  @Cron('0 8 * * *', {
    name: 'notify-low-stock',
    timeZone: 'America/Havana',
  })
  async notifyLowStock() {
    this.logger.log('🕐 [CRON] Buscando stock bajo...');

    try {
      const lowStocks = await this.stocksRepository
        .createQueryBuilder('stock')
        .leftJoinAndSelect('stock.product', 'product')
        .leftJoinAndSelect('stock.warehouse', 'warehouse')
        .where('stock.quantity <= stock.minStock')
        .andWhere('stock.quantity > 0')
        .orderBy('stock.quantity', 'ASC')
        .getMany();

      if (lowStocks.length === 0) {
        this.logger.log('✅ [CRON] Sin stock bajo');
        return 0;
      }

      this.logger.warn(`⚠️ [CRON] ${lowStocks.length} producto(s) con stock bajo:`);
      for (const s of lowStocks.slice(0, 20)) {
        this.logger.warn(
          `   • ${s.product?.name} en ${s.warehouse?.name}: ${s.quantity}/${s.minStock}`,
        );
      }
      return lowStocks.length;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // 2. NOTIFICAR PRODUCTOS SIN STOCK (Diario 08:00)
  // ============================================
  @Cron('0 8 * * *', {
    name: 'notify-out-of-stock',
    timeZone: 'America/Havana',
  })
  async notifyOutOfStock() {
    this.logger.log('🕐 [CRON] Buscando productos agotados...');

    try {
      const outOfStocks = await this.stocksRepository
        .createQueryBuilder('stock')
        .leftJoinAndSelect('stock.product', 'product')
        .leftJoinAndSelect('stock.warehouse', 'warehouse')
        .where('stock.quantity = 0')
        .getMany();

      if (outOfStocks.length === 0) {
        this.logger.log('✅ [CRON] Sin productos agotados');
        return 0;
      }

      this.logger.warn(`⚠️ [CRON] ${outOfStocks.length} producto(s) sin stock:`);
      for (const s of outOfStocks.slice(0, 20)) {
        this.logger.warn(`   • ${s.product?.name} en ${s.warehouse?.name}`);
      }
      if (outOfStocks.length > 20) {
        this.logger.warn(`   ... y ${outOfStocks.length - 20} más`);
      }
      return outOfStocks.length;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // 3. ALERTA DE SOBRE-STOCK (Semanal lunes 09:00)
  // ============================================
  @Cron('0 9 * * 1', {
    name: 'notify-overstock',
    timeZone: 'America/Havana',
  })
  async notifyOverstock() {
    this.logger.log('🕐 [CRON] Buscando sobre-stock...');

    try {
      const overstocks = await this.stocksRepository
        .createQueryBuilder('stock')
        .leftJoinAndSelect('stock.product', 'product')
        .leftJoinAndSelect('stock.warehouse', 'warehouse')
        .where('stock.maxStock IS NOT NULL')
        .andWhere('stock.quantity > stock.maxStock')
        .getMany();

      if (overstocks.length === 0) {
        this.logger.log('✅ [CRON] Sin sobre-stock');
        return 0;
      }

      this.logger.warn(`⚠️ [CRON] ${overstocks.length} producto(s) con exceso:`);
      for (const s of overstocks.slice(0, 10)) {
        this.logger.warn(
          `   • ${s.product?.name} en ${s.warehouse?.name}: ${s.quantity}/${s.maxStock}`,
        );
      }
      return overstocks.length;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // 4. REPORTE DIARIO DE INVENTARIO (Diario 07:00)
  // ============================================
  @Cron('0 7 * * *', {
    name: 'daily-inventory-report',
    timeZone: 'America/Havana',
  })
  async dailyInventoryReport() {
    this.logger.log('🕐 [CRON] Reporte diario de inventario...');

    try {
      const totalStocks = await this.stocksRepository.count();

      const totals = await this.stocksRepository
        .createQueryBuilder('stock')
        .select('SUM(stock.quantity)', 'totalQty')
        .addSelect('COUNT(DISTINCT stock.productId)', 'productCount')
        .addSelect('COUNT(DISTINCT stock.warehouseId)', 'warehouseCount')
        .getRawOne();

      this.logger.log(
        `📊 [CRON] Inventario: ${totalStocks} stocks | ` +
          `${totals?.productCount || 0} productos | ` +
          `${totals?.warehouseCount || 0} almacenes | ` +
          `${totals?.totalQty || 0} unidades totales`,
      );

      return {
        totalStocks,
        productCount: parseInt(totals?.productCount || '0', 10),
        warehouseCount: parseInt(totals?.warehouseCount || '0', 10),
        totalQuantity: parseFloat(totals?.totalQty || 0),
      };
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return null;
    }
  }
}
