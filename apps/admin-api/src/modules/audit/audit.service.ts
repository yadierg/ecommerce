// apps/admin-api/src/modules/audit/audit.service.ts
import {
  Injectable,
  Logger,        // ← AGREGAR
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { AuditLog } from '@ecommerce/core';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * Guardar un log de auditoría
   */
  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const log = this.auditRepository.create(dto);
      return await this.auditRepository.save(log);
    } catch (error) {
      this.logger.error(`Error guardando audit log: ${error.message}`);
      // No lanzar error para no romper la operación principal
      return null;
    }
  }

  /**
   * Listar logs con filtros y paginación
   */
  async findAll(query: QueryAuditLogDto) {
    const { page = 1, limit = 20, from, to, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AuditLog> = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.entity) where.entity = filters.entity;
    if (filters.entityId) where.entityId = filters.entityId;

    if (from && to) {
      where.createdAt = Between(new Date(from), new Date(to));
    }

    const [data, total] = await this.auditRepository.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener un log por ID
   */
  async findOne(id: string): Promise<AuditLog> {
    const log = await this.auditRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!log) {
      throw new NotFoundException(`Audit log ${id} no encontrado`);
    }

    return log;
  }

  /**
   * Obtener estadísticas de auditoría
   */
  async getStats() {
    const total = await this.auditRepository.count();

    // Conteo por acción
    const byAction = await this.auditRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.action')
      .getRawMany();

    // Conteo por entidad
    const byEntity = await this.auditRepository
      .createQueryBuilder('log')
      .select('log.entity', 'entity')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.entity')
      .getRawMany();

    // Últimos 7 días
    const last7Days = await this.auditRepository
      .createQueryBuilder('log')
      .select('DATE(log.created_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('log.created_at >= :date', {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      })
      .groupBy('DATE(log.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      total,
      byAction,
      byEntity,
      last7Days,
    };
  }

  /**
   * Eliminar logs antiguos (para tareas de limpieza)
   */
  async cleanOldLogs(days: number = 90): Promise<{ deleted: number }> {
    const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.auditRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :date', { date })
      .execute();

    return { deleted: result.affected || 0 };
  }
}