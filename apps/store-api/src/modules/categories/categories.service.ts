import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from '@ecommerce/core';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  // Generar slug
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // CREATE
  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug || this.slugify(dto.name);

    const existing = await this.categoriesRepository.findOne({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(`La categoría "${slug}" ya existe`);
    }

    const category = this.categoriesRepository.create({
      ...dto,
      slug,
    });

    return this.categoriesRepository.save(category);
  }

  // READ ALL
  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.categoriesRepository.find({
      where,
      relations: ['parent', 'children'],
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  // READ TREE (categorías jerárquicas)
  async findTree() {
    const categories = await this.categoriesRepository.find({
      where: { isActive: true, parentId: IsNull() },
      relations: ['children', 'children.children'],
      order: { order: 'ASC', name: 'ASC' },
    });
    return categories;
  }

  // READ ONE
  async findOne(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['parent', 'children', 'products'],
    });

    if (!category) {
      throw new NotFoundException(`Categoría ${id} no encontrada`);
    }

    return category;
  }

  // READ BY SLUG
  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { slug },
      relations: ['parent', 'children', 'products'],
    });

    if (!category) {
      throw new NotFoundException(`Categoría "${slug}" no encontrada`);
    }

    return category;
  }

  // UPDATE
  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    if (dto.name && !dto.slug) {
      dto.slug = this.slugify(dto.name);
    }

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoriesRepository.findOne({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException(`La categoría "${dto.slug}" ya existe`);
      }
    }

    Object.assign(category, dto);
    return this.categoriesRepository.save(category);
  }

  // DELETE
  async remove(id: string): Promise<{ message: string }> {
    const category = await this.findOne(id);

    // Verificar que no tenga hijos
    if (category.children?.length > 0) {
      throw new ConflictException(
        'No se puede eliminar una categoría con subcategorías',
      );
    }

    await this.categoriesRepository.remove(category);
    return { message: 'Categoría eliminada' };
  }

  // STATS
  async getStats() {
    const total = await this.categoriesRepository.count();
    const active = await this.categoriesRepository.count({
      where: { isActive: true },
    });
    const root = await this.categoriesRepository.count({
      where: { parentId: IsNull() },
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