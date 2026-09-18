// apps/admin-api/src/modules/settings/settings.seeder.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Injectable()
export class SettingsSeeder implements OnModuleInit {
  private readonly logger = new Logger(SettingsSeeder.name);

  constructor(private readonly settingsService: SettingsService) {}

  async onModuleInit() {
    await this.seed();
  }

  private async seed() {
    const defaults = [
      // ============================================
      // GENERAL
      // ============================================
      { key: 'site_name', value: 'Mi Ecommerce', group: 'general', type: 'string', isPublic: true, description: 'Nombre del sitio' },
      { key: 'site_description', value: 'Tienda online', group: 'general', type: 'string', isPublic: true, description: 'Descripción del sitio' },
      { key: 'site_url', value: 'http://localhost:3000', group: 'general', type: 'string', isPublic: true },
      { key: 'currency', value: 'USD', group: 'general', type: 'string', isPublic: true },
      { key: 'currency_symbol', value: '$', group: 'general', type: 'string', isPublic: true },
      { key: 'language', value: 'es', group: 'general', type: 'string', isPublic: true },
      { key: 'timezone', value: 'America/Havana', group: 'general', type: 'string', isPublic: true },

      // ============================================
      // EMAIL
      // ============================================
      { key: 'email_from', value: 'noreply@tudominio.com', group: 'email', type: 'string', isPublic: false },
      { key: 'email_from_name', value: 'Mi Ecommerce', group: 'email', type: 'string', isPublic: false },
      { key: 'email_host', value: 'smtp.gmail.com', group: 'email', type: 'string', isPublic: false },
      { key: 'email_port', value: 587, group: 'email', type: 'number', isPublic: false },

      // ============================================
      // TAX / IMPUESTOS
      // ============================================
      { key: 'tax_enabled', value: true, group: 'tax', type: 'boolean', isPublic: true },
      { key: 'tax_rate', value: 16, group: 'tax', type: 'number', isPublic: true },
      { key: 'tax_included', value: false, group: 'tax', type: 'boolean', isPublic: true },

      // ============================================
      // SHIPPING
      // ============================================
      { key: 'shipping_enabled', value: true, group: 'shipping', type: 'boolean', isPublic: true },
      { key: 'shipping_cost', value: 5, group: 'shipping', type: 'number', isPublic: true },
      { key: 'free_shipping_threshold', value: 50, group: 'shipping', type: 'number', isPublic: true },

      // ============================================
      // STORE
      // ============================================
      { key: 'store_email', value: 'contacto@tudominio.com', group: 'store', type: 'string', isPublic: true },
      { key: 'store_phone', value: '+53 12345678', group: 'store', type: 'string', isPublic: true },
      { key: 'store_address', value: 'Calle Principal 123', group: 'store', type: 'string', isPublic: true },

      // ============================================
      // SECURITY
      // ============================================
      { key: 'maintenance_mode', value: false, group: 'security', type: 'boolean', isPublic: false, isEditable: true },
      { key: 'registration_enabled', value: true, group: 'security', type: 'boolean', isPublic: false },
      { key: 'max_login_attempts', value: 5, group: 'security', type: 'number', isPublic: false },
    ];

    let created = 0;

    for (const setting of defaults) {
      try {
        const exists = await this.settingsService
          .findByKey(setting.key)
          .catch(() => null);

        if (!exists) {
          await this.settingsService.create(setting as any);
          created++;
        }
      } catch (error) {
        this.logger.error(
          `Error creando setting "${setting.key}": ${error.message}`,
        );
      }
    }

    if (created > 0) {
      this.logger.log(`✅ ${created} settings por defecto creados`);
    } else {
      this.logger.log(`✅ Todos los settings ya existen`);
    }
  }
}