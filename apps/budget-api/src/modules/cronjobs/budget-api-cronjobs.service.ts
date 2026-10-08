// apps/budget-api/src/modules/cronjobs/budget-api-cronjobs.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  Invoice,
  InvoiceStatus,
  Warranty,
  WarrantyStatus,
  Client,
  Project,
} from '@ecommerce/core';
import { InvoicesService } from '../invoices/invoices.service';
import { WarrantiesService } from '../warranties/warranties.service';

@Injectable()
export class BudgetApiCronjobsService {
  private readonly logger = new Logger(BudgetApiCronjobsService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectRepository(Warranty)
    private readonly warrantiesRepository: Repository<Warranty>,
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    private readonly invoicesService: InvoicesService,
    private readonly warrantiesService: WarrantiesService,
  ) {}

  // ============================================
  // 1. MARCAR FACTURAS VENCIDAS (Diario 00:00)
  // ============================================
  @Cron('0 0 * * *', {
    name: 'mark-overdue-invoices',
    timeZone: 'America/Havana',
  })
  async markOverdueInvoices() {
    this.logger.log('🕐 [CRON] Marcando facturas vencidas...');

    try {
      const count = await this.invoicesService.checkOverdueInvoices();
      this.logger.log(`✅ [CRON] ${count} factura(s) vencida(s)`);
      return count;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // 2. MARCAR GARANTÍAS VENCIDAS (Diario 00:00)
  // ============================================
  @Cron('0 0 * * *', {
    name: 'mark-expired-warranties',
    timeZone: 'America/Havana',
  })
  async markExpiredWarranties() {
    this.logger.log('🕐 [CRON] Marcando garantías vencidas...');

    try {
      const count = await this.warrantiesService.checkExpiredWarranties();
      this.logger.log(`✅ [CRON] ${count} garantía(s) vencida(s)`);
      return count;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // 3. RECORDATORIO DE FACTURAS POR VENCER (Diario 08:00)
  // ============================================
  @Cron('0 8 * * *', {
    name: 'notify-expiring-invoices',
    timeZone: 'America/Havana',
  })
  async notifyExpiringInvoices() {
    this.logger.log('🕐 [CRON] Buscando facturas por vencer...');

    try {
      const today = new Date();
      const in3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

      const expiring = await this.invoicesRepository.find({
        where: {
          status: InvoiceStatus.SENT,
          dueDate: Between(today, in3Days),
        },
        relations: ['client'],
      });

      if (expiring.length === 0) {
        this.logger.log('✅ [CRON] Sin facturas por vencer');
        return 0;
      }

      this.logger.warn(`⚠️ [CRON] ${expiring.length} factura(s) por vencer:`);
      for (const inv of expiring) {
        this.logger.warn(
          `   • ${inv.invoiceNumber} - ${inv.client?.name} - $${inv.total} - Vence: ${inv.dueDate}`,
        );
      }
      return expiring.length;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // 4. NOTIFICAR GARANTÍAS POR VENCER (Semanal lunes 08:00)
  // ============================================
  @Cron('0 8 * * 1', {
    name: 'notify-expiring-warranties',
    timeZone: 'America/Havana',
  })
  async notifyExpiringWarranties() {
    this.logger.log('🕐 [CRON] Buscando garantías por vencer...');

    try {
      const today = new Date();
      const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const expiring = await this.warrantiesRepository.find({
        where: {
          status: WarrantyStatus.ACTIVE,
          endDate: Between(today, in30Days),
        },
        relations: ['client'],
      });

      if (expiring.length === 0) {
        this.logger.log('✅ [CRON] Sin garantías por vencer');
        return 0;
      }

      this.logger.warn(
        `⚠️ [CRON] ${expiring.length} garantía(s) vencen en 30 días:`,
      );
      for (const w of expiring) {
        this.logger.warn(
          `   • ${w.warrantyNumber} - ${w.client?.name} - Vence: ${w.endDate}`,
        );
      }
      return expiring.length;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // 5. ACTUALIZAR TOTALES DE CLIENTES (Diario 03:00)
  // ============================================
  @Cron('0 3 * * *', {
    name: 'update-client-stats',
    timeZone: 'America/Havana',
  })
  async updateClientStats() {
    this.logger.log('🕐 [CRON] Actualizando stats de clientes...');

    try {
      const clients = await this.clientsRepository.find();
      let updated = 0;

      for (const client of clients) {
        const projectCount = await this.projectsRepository.count({
          where: { clientId: client.id },
        });

        const revenue = await this.invoicesRepository
          .createQueryBuilder('invoice')
          .select('SUM(invoice.total)', 'total')
          .where('invoice.clientId = :clientId', { clientId: client.id })
          .andWhere('invoice.status = :status', { status: InvoiceStatus.PAID })
          .getRawOne();

        const newTotalRevenue = parseFloat(revenue?.total || 0);

        if (
          client.totalProjects !== projectCount ||
          Number(client.totalRevenue) !== newTotalRevenue
        ) {
          client.totalProjects = projectCount;
          client.totalRevenue = newTotalRevenue;
          await this.clientsRepository.save(client);
          updated++;
        }
      }

      this.logger.log(`✅ [CRON] ${updated} cliente(s) actualizado(s)`);
      return updated;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }
}