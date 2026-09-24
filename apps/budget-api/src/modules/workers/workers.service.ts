// apps/budget-api/src/modules/workers/workers.service.ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worker } from '@ecommerce/core';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { QueryWorkerDto } from './dto/query-worker.dto';

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(Worker)
    private readonly workersRepository: Repository<Worker>,
  ) {}

  // ============================================
  // CREATE
  // ============================================
  async create(dto: CreateWorkerDto, tenantId: string): Promise<Worker> {
    const worker = this.workersRepository.create({
      ...dto,
      tenantId,
      hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
    });

    return this.workersRepository.save(worker);
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(query: QueryWorkerDto, tenantId: string) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      specialties,
      isAvailable,
      isActive,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.workersRepository
      .createQueryBuilder('worker')
      .where('worker.tenantId = :tenantId', { tenantId });

    if (search) {
      qb.andWhere(
        '(worker.name ILIKE :search OR worker.email ILIKE :search OR worker.phone ILIKE :search OR worker.position ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) qb.andWhere('worker.role = :role', { role });

    if (isAvailable !== undefined)
      qb.andWhere('worker.isAvailable = :isAvailable', { isAvailable });
    if (isActive !== undefined)
      qb.andWhere('worker.isActive = :isActive', { isActive });

    // Filtro por especialidades (JSONB)
    if (specialties && specialties.length > 0) {
      qb.andWhere('worker.specialties ?| array[:...specialties]', {
        specialties,
      });
    }

    qb.orderBy('worker.isAvailable', 'DESC')
      .addOrderBy('worker.name', 'ASC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

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

  // ============================================
  // READ ONE
  // ============================================
  async findOne(id: string, tenantId: string): Promise<Worker> {
    const worker = await this.workersRepository.findOne({
      where: { id, tenantId },
    });

    if (!worker) {
      throw new NotFoundException(`Worker ${id} no encontrado`);
    }

    return worker;
  }

  // ============================================
  // AVAILABLE WORKERS
  // ============================================
  async findAvailable(tenantId: string, role?: string) {
    const where: any = { tenantId, isAvailable: true, isActive: true };
    if (role) where.role = role;

    return this.workersRepository.find({
      where,
      order: { rating: 'DESC', name: 'ASC' },
    });
  }

  // ============================================
  // BY SPECIALTY
  // ============================================
  async findBySpecialty(tenantId: string, specialty: string) {
    return this.workersRepository
      .createQueryBuilder('worker')
      .where('worker.tenantId = :tenantId', { tenantId })
      .andWhere('worker.isActive = true')
      .andWhere('worker.specialties ? :specialty', { specialty })
      .orderBy('worker.rating', 'DESC')
      .getMany();
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(
    id: string,
    dto: UpdateWorkerDto,
    tenantId: string,
  ): Promise<Worker> {
    const worker = await this.findOne(id, tenantId);

    if (dto.hireDate) {
      (dto as any).hireDate = new Date(dto.hireDate);
    }

    Object.assign(worker, dto);
    return this.workersRepository.save(worker);
  }

  // ============================================
  // UPDATE AVAILABILITY
  // ============================================
  async setAvailability(
    id: string,
    isAvailable: boolean,
    tenantId: string,
  ): Promise<Worker> {
    const worker = await this.findOne(id, tenantId);
    worker.isAvailable = isAvailable;
    return this.workersRepository.save(worker);
  }

  // ============================================
  // UPDATE STATS
  // ============================================
  async updateStats(
    id: string,
    tenantId: string,
    updates: {
      totalProjects?: number;
      totalHoursLogged?: number;
      rating?: number;
    },
  ): Promise<void> {
    const worker = await this.findOne(id, tenantId);
    Object.assign(worker, updates);
    await this.workersRepository.save(worker);
  }

  // ============================================
  // DELETE
  // ============================================
  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const worker = await this.findOne(id, tenantId);

    if (worker.currentProjectId) {
      throw new NotFoundException(
        `No se puede eliminar un worker asignado a un proyecto. Desactívalo en su lugar.`,
      );
    }

    await this.workersRepository.remove(worker);
    return { message: 'Worker eliminado' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId: string) {
    const total = await this.workersRepository.count({
      where: { tenantId },
    });

    const active = await this.workersRepository.count({
      where: { tenantId, isActive: true },
    });

    const available = await this.workersRepository.count({
      where: { tenantId, isActive: true, isAvailable: true },
    });

    const byRole = await this.workersRepository
      .createQueryBuilder('worker')
      .select('worker.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('worker.tenantId = :tenantId', { tenantId })
      .groupBy('worker.role')
      .getRawMany();

    const avgRate = await this.workersRepository
      .createQueryBuilder('worker')
      .select('AVG(worker.hourlyRate)', 'avgRate')
      .where('worker.tenantId = :tenantId', { tenantId })
      .andWhere('worker.isActive = true')
      .getRawOne();

    return {
      total,
      active,
      inactive: total - active,
      available,
      busy: active - available,
      byRole,
      avgHourlyRate: parseFloat(avgRate?.avgRate || 0),
    };
  }
}