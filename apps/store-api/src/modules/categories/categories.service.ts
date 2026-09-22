// apps/store-api/src/modules/categories/categories.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, FindOptionsWhere } from 'typeorm';
import { Category } from '@ecommerce/core';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // ============================================
  // CREATE
  // ============================================
  async create(dto: CreateCategoryDto, tenantId: string): Promise<Category> {
    const slug = dto.slug || this.slugify(dto.name);

    // Verificar que no exista en el mismo tenant
    const existing = await this.categoriesRepository.findOne({
      where: { slug, tenantId },
    });

    if (existing) {
      throw new ConflictException(`La categoría "${slug}" ya existe`);
    }

    const category = this.categoriesRepository.create({
      ...dto,
      slug,
      tenantId,  // ← Asignar tenant
    });

    return this.categoriesRepository.save(category);
  }

  // ============================================
  // READ ALL (filtrar por tenant)
  // ============================================
  async findAll(tenantId: string, includeInactive = false) {
    const where: FindOptionsWhere<Category> = { tenantId };

    if (!includeInactive) {
      where.isActive = true;
    }

    return this.categoriesRepository.find({
      where,
      relations: ['parent', 'children'],
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  // ============================================
  // READ TREE (filtrar por tenant)
  // ============================================
  async findTree(tenantId: string) {
    return this.categoriesRepository.find({
      where: { tenantId, isActive: true, parentId: IsNull() },
      relations: ['children', 'children.children'],
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  // ============================================
  // READ ONE (validar tenant)
  // ============================================
  async findOne(id: string, tenantId: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id, tenantId },  // ← Filtrar por tenant
      relations: ['parent', 'children', 'products'],
    });

    if (!category) {
      throw new NotFoundException(`Categoría ${id} no encontrada`);
    }

    return category;
  }

  // ============================================
  // READ BY SLUG
  // ============================================
  async findBySlug(slug: string, tenantId: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { slug, tenantId },
      relations: ['parent', 'children', 'products'],
    });

    if (!category) {
      throw new NotFoundException(`Categoría "${slug}" no encontrada`);
    }

    return category;
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(id: string, dto: UpdateCategoryDto, tenantId: string): Promise<Category> {
    const category = await this.findOne(id, tenantId);

    if (dto.name && !dto.slug) {
      dto.slug = this.slugify(dto.name);
    }

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoriesRepository.findOne({
        where: { slug: dto.slug, tenantId },
      });
      if (existing) {
        throw new ConflictException(`La categoría "${dto.slug}" ya existe`);
      }
    }

    Object.assign(category, dto);
    return this.categoriesRepository.save(category);
  }

  // ============================================
  // DELETE
  // ============================================
  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const category = await this.findOne(id, tenantId);

    if (category.children?.length > 0) {
      throw new ConflictException(
        'No se puede eliminar una categoría con subcategorías',
      );
    }

    await this.categoriesRepository.remove(category);
    return { message: 'Categoría eliminada' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId: string) {
    const total = await this.categoriesRepository.count({
      where: { tenantId },
    });
    const active = await this.categoriesRepository.count({
      where: { tenantId, isActive: true },
    });
    const root = await this.categoriesRepository.count({
      where: { tenantId, parentId: IsNull() },
    });

    return {
      total,
      active,
      inactive: total - active,
      root,
      subcategories: total - root,
    };
  }
}