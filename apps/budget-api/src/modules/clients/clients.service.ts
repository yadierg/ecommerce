// apps/budget-api/src/modules/clients/clients.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '@ecommerce/core';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
  ) {}

  // ============================================
  // CREATE
  // ============================================
  async create(dto: CreateClientDto, tenantId: string): Promise<Client> {
    // Verificar email único (si se proporciona)
    if (dto.email) {
      const existing = await this.clientsRepository.findOne({
        where: { email: dto.email, tenantId },
      });

      if (existing) {
        throw new ConflictException(
          `Ya existe un cliente con el email "${dto.email}"`,
        );
      }
    }

    const client = this.clientsRepository.create({
      ...dto,
      tenantId,
    });

    return this.clientsRepository.save(client);
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(query: QueryClientDto, tenantId: string) {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      category,
      city,
      country,
      isActive,
      isVip,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.clientsRepository
      .createQueryBuilder('client')
      .where('client.tenantId = :tenantId', { tenantId });

    if (search) {
      qb.andWhere(
        '(client.name ILIKE :search OR client.company ILIKE :search OR client.email ILIKE :search OR client.phone ILIKE :search OR client.taxId ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (type) qb.andWhere('client.type = :type', { type });
    if (category) qb.andWhere('client.category = :category', { category });
    if (city) qb.andWhere('client.city = :city', { city });
    if (country) qb.andWhere('client.country = :country', { country });
    if (isActive !== undefined)
      qb.andWhere('client.isActive = :isActive', { isActive });
    if (isVip !== undefined)
      qb.andWhere('client.isVip = :isVip', { isVip });

    qb.orderBy('client.isVip', 'DESC')
      .addOrderBy('client.name', 'ASC')
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
  async findOne(id: string, tenantId: string): Promise<Client> {
    const client = await this.clientsRepository.findOne({
      where: { id, tenantId },
    });

    if (!client) {
      throw new NotFoundException(`Cliente ${id} no encontrado`);
    }

    return client;
  }

  // ============================================
  // SEARCH BY EMAIL
  // ============================================
  async findByEmail(email: string, tenantId: string): Promise<Client | null> {
    return this.clientsRepository.findOne({
      where: { email, tenantId },
    });
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(
    id: string,
    dto: UpdateClientDto,
    tenantId: string,
  ): Promise<Client> {
    const client = await this.findOne(id, tenantId);

    // Verificar email único si cambia
    if (dto.email && dto.email !== client.email) {
      const existing = await this.clientsRepository.findOne({
        where: { email: dto.email, tenantId },
      });

      if (existing) {
        throw new ConflictException(
          `Ya existe un cliente con el email "${dto.email}"`,
        );
      }
    }

    Object.assign(client, dto);
    return this.clientsRepository.save(client);
  }

  // ============================================
  // UPDATE STATS
  // ============================================
  async updateStats(
    id: string,
    tenantId: string,
    updates: {
      totalProjects?: number;
      totalRevenue?: number;
      lastProjectAt?: Date;
    },
  ): Promise<void> {
    const client = await this.findOne(id, tenantId);
    Object.assign(client, updates);
    await this.clientsRepository.save(client);
  }

  // ============================================
  // DELETE
  // ============================================
  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const client = await this.findOne(id, tenantId);

    if (client.totalProjects > 0) {
      throw new ConflictException(
        `No se puede eliminar un cliente con ${client.totalProjects} proyectos. Desactívalo en su lugar.`,
      );
    }

    await this.clientsRepository.remove(client);
    return { message: 'Cliente eliminado' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId: string) {
    const total = await this.clientsRepository.count({
      where: { tenantId },
    });

    const active = await this.clientsRepository.count({
      where: { tenantId, isActive: true },
    });

    const vip = await this.clientsRepository.count({
      where: { tenantId, isVip: true },
    });

    const byType = await this.clientsRepository
      .createQueryBuilder('client')
      .select('client.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('client.tenantId = :tenantId', { tenantId })
      .groupBy('client.type')
      .getRawMany();

    const byCategory = await this.clientsRepository
      .createQueryBuilder('client')
      .select('client.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('client.tenantId = :tenantId', { tenantId })
      .andWhere('client.category IS NOT NULL')
      .groupBy('client.category')
      .getRawMany();

    return {
      total,
      active,
      inactive: total - active,
      vip,
      byType,
      byCategory,
    };
  }
}