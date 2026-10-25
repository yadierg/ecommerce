import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitOfMeasure, UnitType } from '@ecommerce/core';

@Injectable()
export class UnitsOfMeasureSeeder implements OnModuleInit {
  private readonly logger = new Logger(UnitsOfMeasureSeeder.name);

  constructor(
    @InjectRepository(UnitOfMeasure)
    private readonly unitsRepository: Repository<UnitOfMeasure>,
  ) {}

  async onModuleInit() {
    await this.seedSystemUnits();
  }

  private async seedSystemUnits() {
    const systemUnits = [
      // UNIDADES
      { name: 'Unidad', abbreviation: 'unit', type: UnitType.UNIT, decimalPlaces: 0, order: 1 },
      { name: 'Par', abbreviation: 'pair', type: UnitType.UNIT, decimalPlaces: 0, order: 2 },
      { name: 'Docena', abbreviation: 'dozen', type: UnitType.UNIT, decimalPlaces: 0, order: 3 },
      { name: 'Set', abbreviation: 'set', type: UnitType.UNIT, decimalPlaces: 0, order: 4 },
      { name: 'Caja', abbreviation: 'box', type: UnitType.UNIT, decimalPlaces: 0, order: 5 },
      { name: 'Paquete', abbreviation: 'pack', type: UnitType.UNIT, decimalPlaces: 0, order: 6 },
      { name: 'Rollo', abbreviation: 'roll', type: UnitType.UNIT, decimalPlaces: 0, order: 7 },

      // LONGITUD
      { name: 'Milímetro', abbreviation: 'mm', nameEn: 'Millimeter', type: UnitType.LENGTH, decimalPlaces: 2, order: 10 },
      { name: 'Centímetro', abbreviation: 'cm', nameEn: 'Centimeter', type: UnitType.LENGTH, decimalPlaces: 2, order: 11 },
      { name: 'Metro', abbreviation: 'm', nameEn: 'Meter', type: UnitType.LENGTH, decimalPlaces: 2, order: 12 },
      { name: 'Metro lineal', abbreviation: 'm linear', nameEn: 'Linear meter', type: UnitType.LENGTH, decimalPlaces: 2, order: 13 },
      { name: 'Kilómetro', abbreviation: 'km', nameEn: 'Kilometer', type: UnitType.LENGTH, decimalPlaces: 2, order: 14 },

      // ÁREA
      { name: 'Metro cuadrado', abbreviation: 'm²', nameEn: 'Square meter', type: UnitType.AREA, decimalPlaces: 2, order: 20 },
      { name: 'Hectárea', abbreviation: 'ha', nameEn: 'Hectare', type: UnitType.AREA, decimalPlaces: 2, order: 21 },

      // VOLUMEN
      { name: 'Mililitro', abbreviation: 'mL', nameEn: 'Milliliter', type: UnitType.VOLUME, decimalPlaces: 2, order: 30 },
      { name: 'Litro', abbreviation: 'L', nameEn: 'Liter', type: UnitType.VOLUME, decimalPlaces: 2, order: 31 },
      { name: 'Metro cúbico', abbreviation: 'm³', nameEn: 'Cubic meter', type: UnitType.VOLUME, decimalPlaces: 2, order: 32 },

      // PESO
      { name: 'Gramo', abbreviation: 'g', nameEn: 'Gram', type: UnitType.WEIGHT, decimalPlaces: 2, order: 40 },
      { name: 'Kilogramo', abbreviation: 'kg', nameEn: 'Kilogram', type: UnitType.WEIGHT, decimalPlaces: 2, order: 41 },
      { name: 'Tonelada', abbreviation: 'ton', nameEn: 'Ton', type: UnitType.WEIGHT, decimalPlaces: 2, order: 42 },

      // TIEMPO
      { name: 'Hora', abbreviation: 'h', nameEn: 'Hour', type: UnitType.TIME, decimalPlaces: 2, order: 50 },
      { name: 'Día', abbreviation: 'd', nameEn: 'Day', type: UnitType.TIME, decimalPlaces: 0, order: 51 },

      // SERVICIO
      { name: 'Servicio', abbreviation: 'svc', nameEn: 'Service', type: UnitType.SERVICE, decimalPlaces: 0, order: 60 },
    ];

    let created = 0;

    for (const unitData of systemUnits) {
      const existing = await this.unitsRepository.findOne({
        where: { abbreviation: unitData.abbreviation, tenantId: null },
      });

      if (!existing) {
        await this.unitsRepository.save(
          this.unitsRepository.create({
            ...unitData,
            tenantId: null,
            isSystem: true,
            isActive: true,
          }),
        );
        created++;
      }
    }

    if (created > 0) {
      this.logger.log(`✅ ${created} unidades del sistema creadas`);
    }
  }
}