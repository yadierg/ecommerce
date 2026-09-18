// apps/admin-api/src/modules/settings/settings.module.ts
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from '../../entities/setting.entity';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsSeeder } from './settings.seeder';

@Global() // ← Global para inyectar en cualquier módulo
@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  controllers: [SettingsController],
  providers: [SettingsService, SettingsSeeder],
  exports: [SettingsService],
})
export class SettingsModule {}