// apps/admin-api/src/modules/cronjobs/admin-api-cronjobs.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AuditLog, Session, Tenant, User } from '@ecommerce/core';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminApiCronjobsService {
  private readonly logger = new Logger(AdminApiCronjobsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    @InjectRepository(Tenant)
    private readonly tenantsRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  // ============================================
  // 1. LIMPIAR AUDIT LOGS ANTIGUOS (Semanal domingo 03:00)
  // ============================================
  @Cron('0 3 * * 0', {
    name: 'clean-old-audit-logs',
    timeZone: 'America/Havana',
  })
  async cleanOldAuditLogs() {
    this.logger.log('🕐 [CRON] Limpiando audit logs > 90 días...');

    try {
      const result = await this.auditService.cleanOldLogs(90);
      this.logger.log(`✅ [CRON] ${result.deleted} audit log(s) eliminado(s)`);
      return result.deleted;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // 2. LIMPIAR SESIONES EXPIRADAS (Diario 02:00)
  // ============================================
  @Cron('0 2 * * *', {
    name: 'clean-expired-sessions',
    timeZone: 'America/Havana',
  })
  async cleanExpiredSessions() {
    this.logger.log('🕐 [CRON] Limpiando sesiones expiradas...');

    try {
      const result = await this.sessionsRepository.delete({
        expiresAt: LessThan(new Date()),
        isActive: false,
      });

      const deleted = result.affected || 0;
      this.logger.log(`✅ [CRON] ${deleted} sesión(es) eliminada(s)`);
      return deleted;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // 3. DESACTIVAR SESIONES EXPIRADAS (Diario 02:30)
  // ============================================
  @Cron('30 2 * * *', {
    name: 'deactivate-expired-sessions',
    timeZone: 'America/Havana',
  })
  async deactivateExpiredSessions() {
    this.logger.log('🕐 [CRON] Desactivando sesiones expiradas...');

    try {
      const result = await this.sessionsRepository
        .createQueryBuilder()
        .update(Session)
        .set({ isActive: false })
        .where('expiresAt < :now', { now: new Date() })
        .andWhere('isActive = :isActive', { isActive: true })
        .execute();

      const updated = result.affected || 0;
      this.logger.log(`✅ [CRON] ${updated} sesión(es) desactivada(s)`);
      return updated;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // 4. VERIFICAR PLANES DE TENANTS (Diario 06:00)
  // ============================================
  @Cron('0 6 * * *', {
    name: 'check-tenant-plans',
    timeZone: 'America/Havana',
  })
  async checkTenantPlans() {
    this.logger.log('🕐 [CRON] Verificando planes de tenants...');

    try {
      const today = new Date();
      const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const expiring = await this.tenantsRepository.find({
        where: { isActive: true, planExpiresAt: LessThan(in7Days) },
      });

      const expired = await this.tenantsRepository.find({
        where: { isActive: true, planExpiresAt: LessThan(today) },
      });

      if (expiring.length > 0) {
        this.logger.warn(`⚠️ [CRON] ${expiring.length} plan(es) por vencer:`);
        for (const t of expiring) {
          this.logger.warn(`   • ${t.name} - Vence: ${t.planExpiresAt}`);
        }
      }
      if (expired.length > 0) {
        this.logger.error(`🚨 [CRON] ${expired.length} plan(es) vencido(s):`);
        for (const t of expired) {
          this.logger.error(`   • ${t.name} - Venció: ${t.planExpiresAt}`);
        }
      }
      if (expiring.length === 0 && expired.length === 0) {
        this.logger.log('✅ [CRON] Sin planes por vencer');
      }

      return expiring.length + expired.length;
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // 5. REPORTE DIARIO DE USUARIOS (Diario 07:00)
  // ============================================
  @Cron('0 7 * * *', {
    name: 'daily-user-report',
    timeZone: 'America/Havana',
  })
  async dailyUserReport() {
    this.logger.log('🕐 [CRON] Reporte diario de usuarios...');

    try {
      const total = await this.usersRepository.count();
      const active = await this.usersRepository.count({
        where: { isActive: true },
      });
      const superAdmins = await this.usersRepository.count({
        where: { isSuperAdmin: true },
      });

      this.logger.log(
        `📊 [CRON] Usuarios: ${total} total | ${active} activos | ` +
          `${total - active} inactivos | ${superAdmins} super admins`,
      );

      return { total, active, superAdmins };
    } catch (error) {
      this.logger.error(`❌ [CRON] Error: ${error.message}`);
      return null;
    }
  }
}