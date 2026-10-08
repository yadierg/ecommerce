// apps/store-api/src/modules/categories/categories.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { CategoriesService } from './categories.service';
import { Category } from '@ecommerce/core';

// ============================================
// MOCKS
// ============================================
const mockCategoriesRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
};

// ============================================
// TEST SUITE
// ============================================
describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoriesRepository: typeof mockCategoriesRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoriesRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    categoriesRepository = module.get(getRepositoryToken(Category));
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.values(mockCategoriesRepository).forEach((mock: any) => {
      if (mock?.mockReset) mock.mockReset();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // HELPERS
  // ============================================
  const mockCategory = (overrides: Partial<Category> = {}): Category =>
    ({
      id: 'cat-1',
      tenantId: 'tenant-1',
      name: 'Electrónica',
      slug: 'electronica',
      description: null,
      imageUrl: null,
      parentId: null,
      parent: null,
      children: [],
      order: 0,
      isActive: true,
      isFeatured: false,
      products: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Category;

  // ============================================
  // CREATE
  // ============================================
  describe('create', () => {
    const validDto = { name: 'Electrónica' };

    it('should create category with generated slug', async () => {
      categoriesRepository.findOne.mockResolvedValue(null);
      categoriesRepository.create.mockImplementation((data) => data);
      categoriesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'cat-1' }),
      );

      const result = await service.create(validDto, 'tenant-1');

      expect(categoriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Electrónica',
          slug: 'electronica',
          tenantId: 'tenant-1',
        }),
      );
      expect(result.id).toBe('cat-1');
    });

    it('should use custom slug when provided', async () => {
      categoriesRepository.findOne.mockResolvedValue(null);
      categoriesRepository.create.mockImplementation((data) => data);
      categoriesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'cat-1' }),
      );

      await service.create(
        { name: 'Electrónica', slug: 'custom-slug' },
        'tenant-1',
      );

      expect(categoriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'custom-slug' }),
      );
    });

    it('should slugify name with accents and spaces', async () => {
      categoriesRepository.findOne.mockResolvedValue(null);
      categoriesRepository.create.mockImplementation((data) => data);
      categoriesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'cat-1' }),
      );

      await service.create({ name: 'Café & Té Ñoño' }, 'tenant-1');

      expect(categoriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'cafe-te-nono' }),
      );
    });

    it('should throw ConflictException if slug exists', async () => {
      categoriesRepository.findOne.mockResolvedValue(mockCategory());

      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(validDto, 'tenant-1')).rejects.toThrow(
        'La categoría "electronica" ya existe',
      );
    });

    it('should check slug uniqueness within tenant', async () => {
      categoriesRepository.findOne.mockResolvedValue(null);
      categoriesRepository.create.mockImplementation((data) => data);
      categoriesRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: 'cat-1' }),
      );

      await service.create(validDto, 'tenant-1');

      expect(categoriesRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'electronica', tenantId: 'tenant-1' },
      });
    });
  });

  // ============================================
  // FIND ALL
  // ============================================
  describe('findAll', () => {
    it('should return only active categories by default', async () => {
      categoriesRepository.find.mockResolvedValue([]);

      await service.findAll('tenant-1');

      expect(categoriesRepository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isActive: true },
        relations: ['parent', 'children'],
        order: { order: 'ASC', name: 'ASC' },
      });
    });

    it('should include inactive when includeInactive is true', async () => {
      categoriesRepository.find.mockResolvedValue([]);

      await service.findAll('tenant-1', true);

      expect(categoriesRepository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        relations: ['parent', 'children'],
        order: { order: 'ASC', name: 'ASC' },
      });
    });

    it('should filter by tenantId', async () => {
      categoriesRepository.find.mockResolvedValue([]);

      await service.findAll('tenant-1');

      const call = categoriesRepository.find.mock.calls[0][0];
      expect(call.where.tenantId).toBe('tenant-1');
    });
  });

  // ============================================
  // FIND TREE
  // ============================================
  describe('findTree', () => {
    it('should return root categories with nested children', async () => {
      const tree = [mockCategory({ children: [mockCategory({ id: 'cat-child' })] })];
      categoriesRepository.find.mockResolvedValue(tree);

      const result = await service.findTree('tenant-1');

      expect(result).toEqual(tree);
      expect(categoriesRepository.find).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          isActive: true,
          parentId: IsNull(),
        },
        relations: ['children', 'children.children'],
        order: { order: 'ASC', name: 'ASC' },
      });
    });

    it('should filter by tenantId', async () => {
      categoriesRepository.find.mockResolvedValue([]);

      await service.findTree('tenant-1');

      const call = categoriesRepository.find.mock.calls[0][0];
      expect(call.where.tenantId).toBe('tenant-1');
    });
  });

  // ============================================
  // FIND ONE
  // ============================================
  describe('findOne', () => {
    it('should return category with relations', async () => {
      const category = mockCategory();
      categoriesRepository.findOne.mockResolvedValue(category);

      const result = await service.findOne('cat-1', 'tenant-1');

      expect(result).toEqual(category);
      expect(categoriesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'cat-1', tenantId: 'tenant-1' },
        relations: ['parent', 'children', 'products'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      categoriesRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('cat-1', 'tenant-1')).rejects.toThrow(
        'Categoría cat-1 no encontrada',
      );
    });
  });

  // ============================================
  // FIND BY SLUG
  // ============================================
  describe('findBySlug', () => {
    it('should return category by slug', async () => {
      const category = mockCategory();
      categoriesRepository.findOne.mockResolvedValue(category);

      const result = await service.findBySlug('electronica', 'tenant-1');

      expect(result).toEqual(category);
      expect(categoriesRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'electronica', tenantId: 'tenant-1' },
        relations: ['parent', 'children', 'products'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      categoriesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findBySlug('no-existe', 'tenant-1'),
      ).rejects.toThrow('Categoría "no-existe" no encontrada');
    });
  });

  // ============================================
  // UPDATE
  // ============================================
  describe('update', () => {
    it('should regenerate slug when name changes without slug', async () => {
      const category = mockCategory({ slug: 'old-slug' });
      categoriesRepository.findOne
        .mockResolvedValueOnce(category) // findOne
        .mockResolvedValueOnce(null); // slug check
      categoriesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('cat-1', { name: 'Nuevo Nombre' }, 'tenant-1');

      expect(categoriesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'nuevo-nombre' }),
      );
    });

    it('should check slug uniqueness when slug changes', async () => {
      const category = mockCategory({ slug: 'old' });
      categoriesRepository.findOne
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce(null);
      categoriesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('cat-1', { slug: 'new' }, 'tenant-1');

      expect(categoriesRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'new', tenantId: 'tenant-1' },
      });
    });

    it('should NOT check slug if unchanged', async () => {
      const category = mockCategory({ slug: 'same' });
      categoriesRepository.findOne.mockResolvedValueOnce(category);
      categoriesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      await service.update('cat-1', { slug: 'same' }, 'tenant-1');

      // Solo el findOne inicial
      expect(categoriesRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if new slug taken', async () => {
      const category = mockCategory({ slug: 'old' });
      categoriesRepository.findOne
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce(mockCategory({ id: 'other' }));

      await expect(
        service.update('cat-1', { slug: 'taken' }, 'tenant-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should update other fields', async () => {
      const category = mockCategory();
      categoriesRepository.findOne.mockResolvedValueOnce(category);
      categoriesRepository.save.mockImplementation((data) =>
        Promise.resolve(data),
      );

      const result = await service.update(
        'cat-1',
        { description: 'Nueva', isFeatured: true },
        'tenant-1',
      );

      expect(result.description).toBe('Nueva');
      expect(result.isFeatured).toBe(true);
    });

    it('should throw NotFoundException if not found', async () => {
      categoriesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('cat-1', { name: 'X' }, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // REMOVE
  // ============================================
  describe('remove', () => {
    it('should remove category without children', async () => {
      const category = mockCategory({ children: [] });
      categoriesRepository.findOne.mockResolvedValue(category);
      categoriesRepository.remove.mockResolvedValue(category);

      const result = await service.remove('cat-1', 'tenant-1');

      expect(result).toEqual({ message: 'Categoría eliminada' });
      expect(categoriesRepository.remove).toHaveBeenCalledWith(category);
    });

    it('should throw ConflictException if has children', async () => {
      categoriesRepository.findOne.mockResolvedValue(
        mockCategory({ children: [mockCategory({ id: 'child' })] }),
      );

      await expect(service.remove('cat-1', 'tenant-1')).rejects.toThrow(
        'No se puede eliminar una categoría con subcategorías',
      );
    });

    it('should not call remove if has children', async () => {
      categoriesRepository.findOne.mockResolvedValue(
        mockCategory({ children: [mockCategory({ id: 'child' })] }),
      );

      await expect(service.remove('cat-1', 'tenant-1')).rejects.toThrow();

      expect(categoriesRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found', async () => {
      categoriesRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('cat-1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // GET STATS
  // ============================================
  describe('getStats', () => {
    it('should return total, active, inactive, root, subcategories', async () => {
      categoriesRepository.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(18) // active
        .mockResolvedValueOnce(5); // root

      const result = await service.getStats('tenant-1');

      expect(result).toEqual({
        total: 20,
        active: 18,
        inactive: 2,
        root: 5,
        subcategories: 15,
      });
    });

    it('should filter counts by tenantId', async () => {
      categoriesRepository.count.mockResolvedValue(0);

      await service.getStats('tenant-1');

      expect(categoriesRepository.count).toHaveBeenNthCalledWith(1, {
        where: { tenantId: 'tenant-1' },
      });
      expect(categoriesRepository.count).toHaveBeenNthCalledWith(2, {
        where: { tenantId: 'tenant-1', isActive: true },
      });
      expect(categoriesRepository.count).toHaveBeenNthCalledWith(3, {
        where: { tenantId: 'tenant-1', parentId: IsNull() },
      });
    });

    it('should return zeros when no categories', async () => {
      categoriesRepository.count.mockResolvedValue(0);

      const result = await service.getStats('tenant-1');

      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
      expect(result.subcategories).toBe(0);
    });
  });
});