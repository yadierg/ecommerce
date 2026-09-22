// apps/store-api/src/modules/products/products.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, Category } from '@ecommerce/core';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
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
  async create(dto: CreateProductDto, tenantId: string): Promise<Product> {
    const slug = dto.slug || this.slugify(dto.name);

    const skuExists = await this.productsRepository.findOne({
      where: { sku: dto.sku, tenantId },
    });
    if (skuExists) {
      throw new ConflictException(`El SKU "${dto.sku}" ya existe`);
    }

    const slugExists = await this.productsRepository.findOne({
      where: { slug, tenantId },
    });
    if (slugExists) {
      throw new ConflictException(`El slug "${slug}" ya existe`);
    }

    if (dto.categoryId) {
      const category = await this.categoriesRepository.findOne({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) {
        throw new BadRequestException('La categoría no existe en tu empresa');
      }
    }

    const product = this.productsRepository.create({
      ...dto,
      slug,
      tenantId,
    });

    return this.productsRepository.save(product);
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(query: QueryProductDto, tenantId: string) {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      brand,
      minPrice,
      maxPrice,
      isActive,
      isFeatured,
      inStock,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const skip = (page - 1) * limit;

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.tenantId = :tenantId', { tenantId });

    if (search) {
      qb.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search OR product.sku ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (brand) {
      qb.andWhere('product.brand = :brand', { brand });
    }

    if (minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (isActive !== undefined) {
      qb.andWhere('product.isActive = :isActive', { isActive });
    } else {
      qb.andWhere('product.isActive = :isActive', { isActive: true });
    }

    if (isFeatured !== undefined) {
      qb.andWhere('product.isFeatured = :isFeatured', { isFeatured });
    }

    if (inStock) {
      qb.andWhere('product.stock > 0');
    }

    const validSortFields = ['name', 'price', 'createdAt', 'soldCount', 'ratingAverage'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    qb.orderBy(`product.${sortField}`, sortOrder);

    qb.skip(skip).take(limit);

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
  async findOne(id: string, tenantId: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id, tenantId },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }

    return product;
  }

  // ============================================
  // READ BY SLUG
  // ============================================
  async findBySlug(slug: string, tenantId: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { slug, tenantId },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Producto "${slug}" no encontrado`);
    }

    await this.productsRepository.increment({ id: product.id }, 'viewCount', 1);

    return product;
  }

  // ============================================
  // FEATURED
  // ============================================
  async findFeatured(tenantId: string, limit = 10) {
    return this.productsRepository.find({
      where: { isFeatured: true, isActive: true, tenantId },
      relations: ['category'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ============================================
  // RELATED
  // ============================================
  async findRelated(id: string, tenantId: string, limit = 5) {
    const product = await this.findOne(id, tenantId);

    if (!product.categoryId) return [];

    return this.productsRepository
      .find({
        where: {
          categoryId: product.categoryId,
          isActive: true,
          tenantId,
        },
        relations: ['category'],
        take: limit + 1,
      })
      .then((products) => products.filter((p) => p.id !== id).slice(0, limit));
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(id: string, dto: UpdateProductDto, tenantId: string): Promise<Product> {
    const product = await this.findOne(id, tenantId);

    if (dto.sku && dto.sku !== product.sku) {
      const skuExists = await this.productsRepository.findOne({
        where: { sku: dto.sku, tenantId },
      });
      if (skuExists) {
        throw new ConflictException(`El SKU "${dto.sku}" ya existe`);
      }
    }

    if (dto.name && !dto.slug) {
      dto.slug = this.slugify(dto.name);
    }

    if (dto.slug && dto.slug !== product.slug) {
      const slugExists = await this.productsRepository.findOne({
        where: { slug: dto.slug, tenantId },
      });
      if (slugExists) {
        throw new ConflictException(`El slug "${dto.slug}" ya existe`);
      }
    }

    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      const category = await this.categoriesRepository.findOne({
        where: { id: dto.categoryId, tenantId },
      });
      if (!category) {
        throw new BadRequestException('La categoría no existe');
      }
    }

    Object.assign(product, dto);
    return this.productsRepository.save(product);
  }

  // ============================================
  // UPDATE STOCK
  // ============================================
  async updateStock(id: string, quantity: number, tenantId: string): Promise<Product> {
    const product = await this.findOne(id, tenantId);

    const newStock = product.stock + quantity;

    if (newStock < 0) {
      throw new BadRequestException('Stock insuficiente');
    }

    product.stock = newStock;
    return this.productsRepository.save(product);
  }

  // ============================================
  // DELETE
  // ============================================
  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const product = await this.findOne(id, tenantId);
    await this.productsRepository.remove(product);
    return { message: 'Producto eliminado' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats(tenantId: string) {
    const total = await this.productsRepository.count({
      where: { tenantId },
    });
    const active = await this.productsRepository.count({
      where: { tenantId, isActive: true },
    });
    const featured = await this.productsRepository.count({
      where: { tenantId, isFeatured: true },
    });
    const outOfStock = await this.productsRepository.count({
      where: { tenantId, stock: 0 },
    });

    const lowStock = await this.productsRepository
      .createQueryBuilder('product')
      .where('product.tenantId = :tenantId', { tenantId })
      .andWhere('product.stock > 0')
      .andWhere('product.stock <= product.lowStockThreshold')
      .getCount();

    const avgPrice = await this.productsRepository
      .createQueryBuilder('product')
      .select('AVG(product.price)', 'avg')
      .where('product.tenantId = :tenantId', { tenantId })
      .getRawOne();

    return {
      total,
      active,
      inactive: total - active,
      featured,
      outOfStock,
      lowStock,
      avgPrice: parseFloat(avgPrice?.avg || 0),
    };
  }

  // ============================================
  // BRANDS
  // ============================================
  async getBrands(tenantId: string): Promise<string[]> {
    const result = await this.productsRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.brand', 'brand')
      .where('product.tenantId = :tenantId', { tenantId })
      .andWhere('product.brand IS NOT NULL')
      .andWhere('product.isActive = true')
      .orderBy('product.brand', 'ASC')
      .getRawMany();

    return result.map((r) => r.brand).filter(Boolean);
  }
}