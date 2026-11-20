// apps/inventory-api/src/modules/stocks/dto/initial-stock.dto.spec.ts
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { InitialStockDto } from './initial-stock.dto';

describe('InitialStockDto', () => {
  const validPayload = {
    warehouseId: '8ce8f633-a091-4513-9215-8c222c8b97c3',
    items: [
      {
        productId: '1dc28125-d543-4e10-8876-a5b63e63691a',
        quantity: 5,
      },
    ],
  };

  const build = (payload: any) => plainToInstance(InitialStockDto, payload);

  it('should accept valid payload with integer quantity', async () => {
    const errors = await validate(build(validPayload));
    expect(errors).toHaveLength(0);
  });

  it('should reject decimal quantity (regression: 5.01)', async () => {
    const errors = await validate(
      build({
        ...validPayload,
        items: [{ productId: validPayload.items[0].productId, quantity: 5.01 }],
      }),
    );

    expect(errors.length).toBeGreaterThan(0);
    const itemErrors = errors[0].children?.[0];
    expect(itemErrors).toBeDefined();
    const quantityError = itemErrors!.children?.find(
      (e) => e.property === 'quantity',
    );
    expect(quantityError).toBeDefined();
    expect(quantityError!.constraints).toHaveProperty('isInt');
  });

  it('should reject negative quantity (@Min(0))', async () => {
    const errors = await validate(
      build({
        ...validPayload,
        items: [{ productId: validPayload.items[0].productId, quantity: -5 }],
      }),
    );

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject invalid UUID for productId', async () => {
    const errors = await validate(
      build({
        ...validPayload,
        items: [{ productId: 'no-es-uuid', quantity: 5 }],
      }),
    );

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject missing warehouseId', async () => {
    const errors = await validate(build({ items: validPayload.items }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept multiple items', async () => {
    const errors = await validate(
      build({
        ...validPayload,
        items: [
          { productId: '1dc28125-d543-4e10-8876-a5b63e63691a', quantity: 100 },
          { productId: 'ae821c8e-8b9e-49c3-99d7-a61673236c6a', quantity: 50 },
        ],
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('should accept optional fields (unitCost, lotNumber, location, notes)', async () => {
    const errors = await validate(
      build({
        ...validPayload,
        items: [
          {
            productId: validPayload.items[0].productId,
            quantity: 5,
            unitCost: 1.5,
            lotNumber: 'LOTE-1',
            location: 'A-1-1',
            notes: 'test',
            estimatedAcquisitionDate: '2024-01-15',
          },
        ],
      }),
    );
    expect(errors).toHaveLength(0);
  });
});