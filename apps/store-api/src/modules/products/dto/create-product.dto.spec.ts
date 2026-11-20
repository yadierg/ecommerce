// apps/store-api/src/modules/products/dto/create-product.dto.spec.ts
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';

describe('CreateProductDto', () => {
  const validPayload = {
    name: 'Panel Solar 400W',
    sku: 'PNL-400',
    price: 85.0,
  };

  const build = (payload: any) => plainToInstance(CreateProductDto, payload);

  it('should accept valid product without unitOfMeasureId', async () => {
    const errors = await validate(build(validPayload));
    expect(errors).toHaveLength(0);
  });

  it('should accept valid product with unitOfMeasureId (UUID)', async () => {
    const errors = await validate(
      build({
        ...validPayload,
        unitOfMeasureId: '0c73b4e8-2973-4e0f-9d3e-f62eec0bc402',
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('should accept null unitOfMeasureId (nullable)', async () => {
    const errors = await validate(
      build({ ...validPayload, unitOfMeasureId: null }),
    );
    expect(errors).toHaveLength(0);
  });

  it('should reject non-UUID unitOfMeasureId', async () => {
    const errors = await validate(
      build({ ...validPayload, unitOfMeasureId: 'no-es-uuid' }),
    );
    expect(errors.length).toBeGreaterThan(0);
    const unitError = errors.find((e) => e.property === 'unitOfMeasureId');
    expect(unitError).toBeDefined();
    expect(unitError!.constraints).toHaveProperty('isUuid');
  });

  it('should reject product without required fields (name, sku, price)', async () => {
    const errors = await validate(build({}));
    expect(errors.length).toBeGreaterThan(0);
  });
});