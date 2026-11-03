// apps/inventory-api/src/modules/price-history/price-history.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceHistory } from '@ecommerce/core';
import { CreatePriceHistoryDto } from './dto/create-price-history.dto';
import { MaterialsService } from '../materials/materials.service';

@Injectable()
export class PriceHistoryService {
  constructor(
    @InjectRepository(PriceHistory)
    private readonly repo: Repository<PriceHistory>,
    private readonly materialsService: MaterialsService,
  ) {}

  async create(dto: CreatePriceHistoryDto, tenantId: string): Promise<PriceHistory> {
    const entity = this.repo.create({
      ...dto,
      tenantId,
      purchaseDate: new Date(dto.purchaseDate),
    });
    const saved = await this.repo.save(entity);

    // Recalcular averageCost automáticamente
    await this.materialsService.recalculateAverageCost(dto.materialId, tenantId);

    return saved;
  }

  async findByMaterial(materialId: string, tenantId: string): Promise<PriceHistory[]> {
    return this.repo.find({
      where: { materialId, tenantId },
      relations: ['supplier'],
      order: { purchaseDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async getStats(materialId: string, tenantId: string) {
    const rows = await this.repo
      .createQueryBuilder('ph')
      .select('MIN(ph.unitCost)', 'minCost')
      .addSelect('MAX(ph.unitCost)', 'maxCost')
      .addSelect('AVG(ph.unitCost)', 'avgCost')
      .addSelect('COUNT(*)', 'count')
      .where('ph.materialId = :materialId', { materialId })
      .andWhere('ph.tenantId = :tenantId', { tenantId })
      .getRawOne();

    return {
      minCost: Number(rows?.minCost ?? 0),
      maxCost: Number(rows?.maxCost ?? 0),
      avgCost: Number(rows?.avgCost ?? 0),
      count: Number(rows?.count ?? 0),
    };
  }

  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const entity = await this.repo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException(`PriceHistory ${id} no encontrado`);
    await this.repo.remove(entity);
    await this.materialsService.recalculateAverageCost(entity.materialId, tenantId);
    return { message: 'Registro de precio eliminado' };
  }
}