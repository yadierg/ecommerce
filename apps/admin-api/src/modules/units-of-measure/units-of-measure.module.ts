import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitOfMeasure, Product } from '@ecommerce/core';
import { UnitsOfMeasureController } from './units-of-measure.controller';
import { UnitsOfMeasureService } from './units-of-measure.service';
import { UnitsOfMeasureSeeder } from './units-of-measure.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([UnitOfMeasure, Product])],
  controllers: [UnitsOfMeasureController],
  providers: [UnitsOfMeasureService, UnitsOfMeasureSeeder],
  exports: [UnitsOfMeasureService],
})
export class UnitsOfMeasureModule {}