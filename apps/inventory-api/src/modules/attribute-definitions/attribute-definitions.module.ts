// apps/inventory-api/src/modules/attribute-definitions/attribute-definitions.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttributeDefinition } from '@ecommerce/core';
import { AttributeDefinitionsController } from './attribute-definitions.controller';
import { AttributeDefinitionsService } from './attribute-definitions.service';

@Module({
  imports: [TypeOrmModule.forFeature([AttributeDefinition])],
  controllers: [AttributeDefinitionsController],
  providers: [AttributeDefinitionsService],
  exports: [AttributeDefinitionsService],
})
export class AttributeDefinitionsModule {}