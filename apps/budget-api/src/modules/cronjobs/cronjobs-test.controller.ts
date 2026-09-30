// apps/budget-api/src/modules/cronjobs/cronjobs-test.controller.ts
import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '@ecommerce/auth';
import { BudgetApiCronjobsService } from './budget-api-cronjobs.service';

@ApiTags('cronjobs')
@ApiBearerAuth()
@Controller('cronjobs')
export class CronjobsTestController {
  constructor(private readonly cronjobsService: BudgetApiCronjobsService) {}

  @Get()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Listar cronjobs disponibles' })
  list() {
    return {
      jobs: [
        { name: 'mark-overdue-invoices', schedule: '0 0 * * *', desc: 'Marcar facturas vencidas' },
        { name: 'mark-expired-warranties', schedule: '0 0 * * *', desc: 'Marcar garantías vencidas' },
        { name: 'notify-expiring-invoices', schedule: '0 8 * * *', desc: 'Notificar facturas por vencer' },
        { name: 'notify-expiring-warranties', schedule: '0 8 * * 1', desc: 'Notificar garantías por vencer' },
        { name: 'update-client-stats', schedule: '0 3 * * *', desc: 'Actualizar stats de clientes' },
      ],
    };
  }

  @Post('mark-overdue-invoices')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Ejecutar: marcar facturas vencidas' })
  async markOverdueInvoices() {
    const count = await this.cronjobsService.markOverdueInvoices();
    return { executed: 'mark-overdue-invoices', result: count };
  }

  @Post('mark-expired-warranties')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Ejecutar: marcar garantías vencidas' })
  async markExpiredWarranties() {
    const count = await this.cronjobsService.markExpiredWarranties();
    return { executed: 'mark-expired-warranties', result: count };
  }

  @Post('notify-expiring-invoices')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Ejecutar: notificar facturas por vencer' })
  async notifyExpiringInvoices() {
    const count = await this.cronjobsService.notifyExpiringInvoices();
    return { executed: 'notify-expiring-invoices', result: count };
  }

  @Post('notify-expiring-warranties')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Ejecutar: notificar garantías por vencer' })
  async notifyExpiringWarranties() {
    const count = await this.cronjobsService.notifyExpiringWarranties();
    return { executed: 'notify-expiring-warranties', result: count };
  }

  @Post('update-client-stats')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Ejecutar: actualizar stats de clientes' })
  async updateClientStats() {
    const count = await this.cronjobsService.updateClientStats();
    return { executed: 'update-client-stats', result: count };
  }
}
