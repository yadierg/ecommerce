import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role, Permission } from '@ecommerce/core';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { RolesSeeder } from './roles.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission])],
  controllers: [RolesController],
  providers: [RolesService, RolesSeeder],
  exports: [RolesService],
})
export class RolesModule {}