import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from '@ecommerce/core';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsSeeder } from './settings.seeder';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  controllers: [SettingsController],
  providers: [SettingsService, SettingsSeeder],
  exports: [SettingsService],
})
export class SettingsModule {}