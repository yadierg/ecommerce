// apps/store-api/src/modules/products/products.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, MoreThan, In } from 'typeorm';
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

  // ============================================
  // SLUGIFY
  // ============================================
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
  async create(dto: CreateProductDto): Promise<Product> {
    const slug = dto.slug || this.slugify(dto.name);

    // Verificar SKU único
    const skuExists = await this.productsRepository.findOne({
      where: { sku: dto.sku },
    });
    if (skuExists) {
      throw new ConflictException(`El SKU "${dto.sku}" ya existe`);
    }

    // Verificar slug único
    const slugExists = await this.productsRepository.findOne({
      where: { slug },
    });
    if (slugExists) {
      throw new ConflictException(`El slug "${slug}" ya existe`);
    }

    // Verificar categoría si se proporciona
    if (dto.categoryId) {
      const category = await this.categoriesRepository.findOne({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new BadRequestException('La categoría no existe');
      }
    }

    const product = this.productsRepository.create({
      ...dto,
      slug,
    });

    return this.productsRepository.save(product);
  }

  // ============================================
  // READ ALL (con filtros)
  // ============================================
  async findAll(query: QueryProductDto) {
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
      .leftJoinAndSelect('product.category', 'category');

    // Filtro de búsqueda
    if (search) {
      qb.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search OR product.sku ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filtros
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
      // Por defecto, solo activos en store
      qb.andWhere('product.isActive = :isActive', { isActive: true });
    }

    if (isFeatured !== undefined) {
      qb.andWhere('product.isFeatured = :isFeatured', { isFeatured });
    }

    if (inStock) {
      qb.andWhere('product.stock > 0');
    }

    // Ordenamiento
    const validSortFields = ['name', 'price', 'createdAt', 'soldCount', 'ratingAverage'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    qb.orderBy(`product.${sortField}`, sortOrder);

    // Paginación
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
  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }

    return product;
  }

  // ============================================
  // READ BY SLUG (público)
  // ============================================
  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { slug },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Producto "${slug}" no encontrado`);
    }

    // Incrementar view count
    await this.productsRepository.increment({ id: product.id }, 'viewCount', 1);

    return product;
  }

  // ============================================
  // READ FEATURED
  // ============================================
  async findFeatured(limit = 10) {
    return this.productsRepository.find({
      where: { isFeatured: true, isActive: true },
      relations: ['category'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ============================================
  // READ RELATED (misma categoría)
  // ============================================
  async findRelated(id: string, limit = 5) {
    const product = await this.findOne(id);

    if (!product.categoryId) {
      return [];
    }

    return this.productsRepository.find({
      where: {
        categoryId: product.categoryId,
        isActive: true,
      },
      relations: ['category'],
      take: limit + 1,
    }).then((products) => products.filter((p) => p.id !== id).slice(0, limit));
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    // Verificar SKU si cambia
    if (dto.sku && dto.sku !== product.sku) {
      const skuExists = await this.productsRepository.findOne({
        where: { sku: dto.sku },
      });
      if (skuExists) {
        throw new ConflictException(`El SKU "${dto.sku}" ya existe`);
      }
    }

    // Verificar slug si cambia
    if (dto.name && !dto.slug) {
      dto.slug = this.slugify(dto.name);
    }

    if (dto.slug && dto.slug !== product.slug) {
      const slugExists = await this.productsRepository.findOne({
        where: { slug: dto.slug },
      });
      if (slugExists) {
        throw new ConflictException(`El slug "${dto.slug}" ya existe`);
      }
    }

    // Verificar categoría si cambia
    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      const category = await this.categoriesRepository.findOne({
        where: { id: dto.categoryId },
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
  async updateStock(id: string, quantity: number): Promise<Product> {
    const product = await this.findOne(id);

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
  async remove(id: string): Promise<{ message: string }> {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
    return { message: 'Producto eliminado' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats() {
    const total = await this.productsRepository.count();
    const active = await this.productsRepository.count({
      where: { isActive: true },
    });
    const featured = await this.productsRepository.count({
      where: { isFeatured: true },
    });
    const outOfStock = await this.productsRepository.count({
      where: { stock: 0 },
    });
    const lowStock = await this.productsRepository
      .createQueryBuilder('product')
      .where('product.stock > 0')
      .andWhere('product.stock <= product.lowStockThreshold')
      .getCount();

    // Precio promedio
    const avgPrice = await this.productsRepository
      .createQueryBuilder('product')
      .select('AVG(product.price)', 'avg')
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
  // GET BRANDS
  // ============================================
  async getBrands(): Promise<string[]> {
    const result = await this.productsRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.brand', 'brand')
      .where('product.brand IS NOT NULL')
      .andWhere('product.isActive = true')
      .orderBy('product.brand', 'ASC')
      .getRawMany();

    return result.map((r) => r.brand).filter(Boolean);
  }
}