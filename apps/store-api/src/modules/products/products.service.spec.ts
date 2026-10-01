// apps/store-api/src/modules/products/products.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { ProductsService } from './products.service';
import { Product, Category } from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockProductsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  increment: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockCategoriesRepository = {
  findOne: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('ProductsService', () => {
  let service: ProductsService;
  let productsRepository: typeof mockProductsRepository;
  let categoriesRepository: typeof mockCategoriesRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductsRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoriesRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productsRepository = module.get(getRepositoryToken(Product));
    categoriesRepository = module.get(getRepositoryToken(Category));
  });

  afterEach(() => {
    jest.clearAllMocks();
    [mockProductsRepository, mockCategoriesRepository].forEach((repo) => {
      Object.values(repo).forEach((mock: any) => {
        if (mock?.mockReset) mock.mockReset();
      });
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // HELPERS
  // ============================================
  const mockProduct = (overrides: Partial<Product> = {}): Product =>
    ({
      id: 'prod-1',
      tenantId: 'tenant-1',
      name: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      sku: 'IPH15PRO-256',
      description: null,
      shortDescription: null,
      price: 999.99,
      comparePrice: null,
      costPrice: null,
      stock: 50,
      lowStockThreshold: 10,
      categoryId: null,
      category: null,
      brand: 'Apple',
      images: [],
      mainImage: null,
      weight: 0,
      dimensions: null,
      isActive: true,
      isFeatured: false,
      isDigital: false,
      viewCount: 0,
      soldCount: 0,
      ratingAverage: 0,
      ratingCount: 0,
      metaTitle: null,
      metaDescription: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Product;

  const mockCategory = { id: 'cat-1', name: 'Electrónica', tenantId: 'tenant-1' };

  const buildQueryBuilder = (data: any[], total?: number) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([data, total ?? data.length]),
    getCount: jest.fn().mockResolvedValue(0),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
  });

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto = {
      name: 'iPhone 15 Pro',
      sku: 'IPH15PRO-256',
      price: 999.99,
    };

    const setupCreateSuccess = () => {
      productsRepository.findOne.mockResolvedValue(null);
      productsRepository.create.mockImplementation((data) => data);
      productsRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'prod-1' }),
      );
    };

    it('should create product with generated slug', async () => {
      setupCreateSuccess();

      const result = await service.create(validDto, 'tenant-1');

      expect(productsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'iPhone 15 Pro',
          slug: 'iphone-15-pro',
          sku: 'IPH15PRO-256',
          tenantId: 'tenant-1',
        }),
      );
      expect(result.id).toBe('prod-1');
    });

    it('should throw ConflictException if SKU exists', async () => {
      productsRepository.findOne
        .mockResolvedValueOnce(mockProduct()); // SKU encontrado

      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        'El SKU "IPH15PRO-256" ya existe',
      );
    });

    it('should throw ConflictException if slug exists', async () => {
      productsRepository.findOne
        .mockResolvedValueOnce(null) // SKU no existe
        .mockResolvedValueOnce(mockProduct()); // slug existe

      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        'El slug "iphone-15-pro" ya existe',
      );
    });

    it('should validate category belongs to tenant', async () => {
      setupCreateSuccess();
      categoriesRepository.findOne.mockResolvedValue(mockCategory);

      await service.create(
        { ...validDto, categoryId: 'cat-1' },
        'tenant-1',
      );

      expect(categoriesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'cat-1', tenantId: 'tenant-1' },
      });
    });

    it('should throw BadRequestException if category not found', async () => {
      productsRepository.findOne.mockResolvedValue(null);
      categoriesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ ...validDto, categoryId: 'cat-1' }, 'tenant-1'),
      ).rejects.toThrow('La categoría no existe en tu empresa');
    });

    it('should use custom slug when provided', async () => {
      setupCreateSuccess();

      await service.create(
        { ...validDto, slug: 'custom-slug' },
        'tenant-1',
      );

      expect(productsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'custom-slug' }),
      );
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should filter by tenantId and default isActive true', async () => {
      const qb = buildQueryBuilder([]);
      productsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'tenant-1');

      expect(qb.where).toHaveBeenCalledWith('product.tenantId = :tenantId', {
        tenantId: 'tenant-1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.isActive = :isActive',
        { isActive: true },
      );
    });

    it('should apply pagination', async () => {
      const qb = buildQueryBuilder([]);
      productsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 3, limit: 5 }, 'tenant-1');

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should apply search across name, description, sku', async () => {
      const qb = buildQueryBuilder([]);
      productsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'iPhone' }, 'tenant-1');

      const searchCall = qb.andWhere.mock.calls.find((call) =>
        call[0].includes('ILIKE'),
      );
      expect(searchCall![0]).toContain('product.name');
      expect(searchCall![0]).toContain('product.description');
      expect(searchCall![0]).toContain('product.sku');
      expect(searchCall![1]).toEqual({ search: '%iPhone%' });
    });

    it('should filter by categoryId, brand', async () => {
      const qb = buildQueryBuilder([]);
      productsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { categoryId: 'cat-1', brand: 'Apple' },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.categoryId = :categoryId',
        { categoryId: 'cat-1' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('product.brand = :brand', {
        brand: 'Apple',
      });
    });

    it('should filter by price range', async () => {
      const qb = buildQueryBuilder([]);
      productsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        { minPrice: 100, maxPrice: 500 },
        'tenant-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.price >= :minPrice',
        { minPrice: 100 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.price <= :maxPrice',
        { maxPrice: 500 },
      );
    });

    it('should apply isActive filter when explicitly provided', async () => {
      const qb = buildQueryBuilder([]);
      productsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ isActive: false }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.isActive = :isActive',
        { isActive: false },
      );
    });

    it('should apply inStock filter', async () => {
      const qb = buildQueryBuilder([]);
      productsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ inStock: true }, 'tenant-1');

      expect(qb.andWhere).toHaveBeenCalledWith('product.stock > 0');
    });

    it('should use valid sortBy field', async () => {
      const qb = buildQueryBuilder([]);
      productsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ sortBy: 'price', sortOrder: 'ASC' }, 'tenant-1');

      expect(qb.orderBy).toHaveBeenCalledWith('product.price', 'ASC');
    });

    it('should fallback to createdAt for invalid sortBy', async () => {
      const qb = buildQueryBuilder([]);
      productsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ sortBy: 'invalid' as any }, 'tenant-1');

      expect(qb.orderBy).toHaveBeenCalledWith('product.createdAt', 'DESC');
    });

    it('should return paginated response with meta', async () => {
      const products = [mockProduct()];
      const qb = buildQueryBuilder(products, 50);
      productsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 2, limit: 20 }, 'tenant-1');

      expect(result.meta.total).toBe(50);
      expect(result.meta.totalPages).toBe(3);
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return product with category', async () => {
      const product = mockProduct();
      productsRepository.findOne.mockResolvedValue(product);

      const result = await service.findOne('prod-1', 'tenant-1');

      expect(result).toEqual(product);
      expect(productsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'prod-1', tenantId: 'tenant-1' },
        relations: ['category'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      productsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('prod-1', 'tenant-1')).rejects.toThrow(
        'Producto prod-1 no encontrado',
      );
    });
  });

  // ============================================
  // FIND BY SLUG (incrementa viewCount)
  // ============================================
  describe('findBySlug', () => {
    it('should return product and increment viewCount', async () => {
      const product = mockProduct();
      productsRepository.findOne.mockResolvedValue(product);
      productsRepository.increment.mockResolvedValue({ affected: 1 });

      const result = await service.findBySlug('iphone-15-pro', 'tenant-1');

      expect(result).toEqual(product);
      expect(productsRepository.increment).toHaveBeenCalledWith(
        { id: 'prod-1' },
        'viewCount',
        1,
      );
    });

    it('should throw NotFoundException if not found', async () => {
      productsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findBySlug('no-existe', 'tenant-1'),
      ).rejects.toThrow('Producto "no-existe" no encontrado');
    });

    it('should NOT increment if not found', async () => {
      productsRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('x', 'tenant-1')).rejects.toThrow();

      expect(productsRepository.increment).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // FIND FEATURED
  // ============================================
  describe('findFeatured', () => {
    it('should return featured active products with default limit 10', async () => {
      const products = [mockProduct()];
      productsRepository.find.mockResolvedValue(products);

      const result = await service.findFeatured('tenant-1');

      expect(result).toEqual(products);
      expect(productsRepository.find).toHaveBeenCalledWith({
        where: { isFeatured: true, isActive: true, tenantId: 'tenant-1' },
        relations: ['category'],
        order: { createdAt: 'DESC' },
        take: 10,
      });
    });

    it('should accept custom limit', async () => {
      productsRepository.find.mockResolvedValue([]);

      await service.findFeatured('tenant-1', 5);

      expect(productsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  // ============================================
  // FIND RELATED
  // ============================================
  describe('findRelated', () => {
    it('should return related products in same category', async () => {
      const product = mockProduct({ categoryId: 'cat-1' });
      productsRepository.findOne.mockResolvedValue(product);
      productsRepository.find.mockResolvedValue([
        mockProduct({ id: 'prod-2' }),
        mockProduct({ id: 'prod-3' }),
      ]);

      const result = await service.findRelated('prod-1', 'tenant-1');

      expect(result).toHaveLength(2);
      expect(productsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            categoryId: 'cat-1',
            isActive: true,
            tenantId: 'tenant-1',
          },
        }),
      );
    });

    it('should exclude current product from results', async () => {
      const product = mockProduct({ categoryId: 'cat-1' });
      productsRepository.findOne.mockResolvedValue(product);
      productsRepository.find.mockResolvedValue([
        mockProduct({ id: 'prod-1' }), // ← es el mismo
        mockProduct({ id: 'prod-2' }),
      ]);

      const result = await service.findRelated('prod-1', 'tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prod-2');
    });

    it('should return empty array if product has no category', async () => {
      productsRepository.findOne.mockResolvedValue(
        mockProduct({ categoryId: null }),
      );

      const result = await service.findRelated('prod-1', 'tenant-1');

      expect(result).toEqual([]);
      expect(productsRepository.find).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should update product fields', async () => {
    const product = mockProduct();
    productsRepository.findOne
        .mockResolvedValueOnce(product) // findOne inicial
        .mockResolvedValueOnce(null);   // check slug 'nuevo-nombre' no existe
    productsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
    );

    const result = await service.update(
        'prod-1',
        { name: 'Nuevo Nombre' },
        'tenant-1',
    );

    expect(result.name).toBe('Nuevo Nombre');
    });

    it('should check SKU uniqueness when changing', async () => {
      const product = mockProduct({ sku: 'OLD-SKU' });
      productsRepository.findOne
        .mockResolvedValueOnce(product) // findOne
        .mockResolvedValueOnce(null); // SKU check
      productsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('prod-1', { sku: 'NEW-SKU' }, 'tenant-1');

      expect(productsRepository.findOne).toHaveBeenCalledWith({
        where: { sku: 'NEW-SKU', tenantId: 'tenant-1' },
      });
    });

    it('should throw ConflictException if new SKU taken', async () => {
      const product = mockProduct({ sku: 'OLD-SKU' });
      productsRepository.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(mockProduct({ id: 'other' }));

      await expect(
        service.update('prod-1', { sku: 'TAKEN' }, 'tenant-1'),
      ).rejects.toThrow('El SKU "TAKEN" ya existe');
    });

    it('should regenerate slug when name changes without slug', async () => {
      const product = mockProduct({ slug: 'old-slug' });
      productsRepository.findOne
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(null);
      productsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('prod-1', { name: 'Nuevo Producto' }, 'tenant-1');

      expect(productsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'nuevo-producto' }),
      );
    });

    it('should validate new category', async () => {
      const product = mockProduct({ categoryId: 'cat-old' });
      productsRepository.findOne.mockResolvedValueOnce(product);
      categoriesRepository.findOne.mockResolvedValue(mockCategory);
      productsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('prod-1', { categoryId: 'cat-new' }, 'tenant-1');

      expect(categoriesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'cat-new', tenantId: 'tenant-1' },
      });
    });

    it('should throw BadRequestException if new category not found', async () => {
      const product = mockProduct({ categoryId: 'cat-old' });
      productsRepository.findOne.mockResolvedValueOnce(product);
      categoriesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('prod-1', { categoryId: 'cat-x' }, 'tenant-1'),
      ).rejects.toThrow('La categoría no existe');
    });

    it('should throw NotFoundException if not found', async () => {
      productsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('prod-1', { name: 'X' }, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // UPDATE STOCK
  // ============================================
  describe('updateStock', () => {
    it('should increase stock with positive quantity', async () => {
      const product = mockProduct({ stock: 50 });
      productsRepository.findOne.mockResolvedValue(product);
      productsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.updateStock('prod-1', 10, 'tenant-1');

      expect(result.stock).toBe(60);
    });

    it('should decrease stock with negative quantity', async () => {
      const product = mockProduct({ stock: 50 });
      productsRepository.findOne.mockResolvedValue(product);
      productsRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.updateStock('prod-1', -20, 'tenant-1');

      expect(result.stock).toBe(30);
    });

    it('should throw BadRequestException if stock goes negative', async () => {
      const product = mockProduct({ stock: 10 });
      productsRepository.findOne.mockResolvedValue(product);

      await expect(
        service.updateStock('prod-1', -20, 'tenant-1'),
      ).rejects.toThrow('Stock insuficiente');
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove product', async () => {
      const product = mockProduct();
      productsRepository.findOne.mockResolvedValue(product);
      productsRepository.remove.mockResolvedValue(product);

      const result = await service.remove('prod-1', 'tenant-1');

      expect(result).toEqual({ message: 'Producto eliminado' });
      expect(productsRepository.remove).toHaveBeenCalledWith(product);
    });

    it('should throw NotFoundException if not found', async () => {
      productsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('prod-1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return full statistics', async () => {
      productsRepository.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(45) // active
        .mockResolvedValueOnce(10) // featured
        .mockResolvedValueOnce(3); // outOfStock

      const lowStockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };

      const avgPriceQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: '250.50' }),
      };

      productsRepository.createQueryBuilder
        .mockReturnValueOnce(lowStockQb)
        .mockReturnValueOnce(avgPriceQb);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(50);
      expect(result.active).toBe(45);
      expect(result.inactive).toBe(5);
      expect(result.featured).toBe(10);
      expect(result.outOfStock).toBe(3);
      expect(result.lowStock).toBe(5);
      expect(result.avgPrice).toBe(250.5);
    });

    it('should filter counts by tenantId', async () => {
      productsRepository.count.mockResolvedValue(0);

      const emptyQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getRawOne: jest.fn().mockResolvedValue(null),
      };
      productsRepository.createQueryBuilder.mockReturnValue(emptyQb);

      await service.getStats('tenant-1');

      expect(productsRepository.count).toHaveBeenNthCalledWith(1, {
        where: { tenantId: 'tenant-1' },
      });
      expect(productsRepository.count).toHaveBeenNthCalledWith(2, {
        where: { tenantId: 'tenant-1', isActive: true },
      });
      expect(productsRepository.count).toHaveBeenNthCalledWith(3, {
        where: { tenantId: 'tenant-1', isFeatured: true },
      });
      expect(productsRepository.count).toHaveBeenNthCalledWith(4, {
        where: { tenantId: 'tenant-1', stock: 0 },
      });
    });
  });

  // ============================================
  // GET BRANDS
  // ============================================
  describe('getBrands', () => {
    it('should return distinct active brands', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { brand: 'Apple' },
          { brand: 'Samsung' },
        ]),
      };
      productsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getBrands('tenant-1');

      expect(result).toEqual(['Apple', 'Samsung']);
    });

    it('should filter out null/empty brands', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { brand: 'Apple' },
          { brand: null },
          { brand: '' },
        ]),
      };
      productsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getBrands('tenant-1');

      expect(result).toEqual(['Apple']);
    });

    it('should return empty array when no brands', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      productsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getBrands('tenant-1');

      expect(result).toEqual([]);
    });
  });
});