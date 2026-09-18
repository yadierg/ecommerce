// apps/admin-api/src/modules/settings/settings.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Setting } from '../../entities/setting.entity';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private cache: Map<string, any> = new Map();

  constructor(
    @InjectRepository(Setting)
    private readonly settingsRepository: Repository<Setting>,
  ) {}

  async onModuleInit() {
    // Cargar settings al iniciar
    await this.loadCache();
  }

  /**
   * Cargar todos los settings en caché
   */
  private async loadCache() {
    const settings = await this.settingsRepository.find();
    this.cache.clear();
    settings.forEach((s) => this.cache.set(s.key, s.value));
    this.logger.log(`✅ ${settings.length} settings cargados en caché`);
  }

  // ============================================
  // CREATE
  // ============================================
  async create(createSettingDto: CreateSettingDto): Promise<Setting> {
    const existing = await this.settingsRepository.findOne({
      where: { key: createSettingDto.key },
    });

    if (existing) {
      throw new ConflictException(
        `El setting "${createSettingDto.key}" ya existe`,
      );
    }

    const setting = this.settingsRepository.create(createSettingDto);
    const saved = await this.settingsRepository.save(setting);

    // Actualizar caché
    this.cache.set(saved.key, saved.value);

    return saved;
  }

  // ============================================
  // READ ALL
  // ============================================
  async findAll(group?: string) {
    const where = group ? { group } : {};
    const settings = await this.settingsRepository.find({
      where,
      order: { group: 'ASC', key: 'ASC' },
    });

    return settings;
  }

  /**
   * Solo settings públicos (para clientes/frontend)
   */
  async findPublic() {
    const settings = await this.settingsRepository.find({
      where: { isPublic: true },
      order: { group: 'ASC', key: 'ASC' },
    });

    // Retornar como objeto plano key: value
    const result: Record<string, any> = {};
    settings.forEach((s) => (result[s.key] = s.value));

    return result;
  }

  // ============================================
  // READ BY KEY
  // ============================================
  async findByKey(key: string): Promise<Setting> {
    const setting = await this.settingsRepository.findOne({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting "${key}" no encontrado`);
    }

    return setting;
  }

  /**
   * Obtener valor de un setting (usa caché)
   */
  async getValue<T = any>(key: string, defaultValue?: T): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const setting = await this.settingsRepository.findOne({
      where: { key },
    });

    if (!setting) {
      if (defaultValue !== undefined) return defaultValue;
      throw new NotFoundException(`Setting "${key}" no encontrado`);
    }

    this.cache.set(key, setting.value);
    return setting.value;
  }

  /**
   * Obtener múltiples valores
   */
  async getValues(keys: string[]): Promise<Record<string, any>> {
    const settings = await this.settingsRepository.find({
      where: { key: In(keys) },
    });

    const result: Record<string, any> = {};
    keys.forEach((key) => {
      const setting = settings.find((s) => s.key === key);
      result[key] = setting ? setting.value : null;
    });

    return result;
  }

  // ============================================
  // READ BY GROUP
  // ============================================
  async findByGroup(group: string) {
    return this.settingsRepository.find({
      where: { group },
      order: { key: 'ASC' },
    });
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(id: string, updateSettingDto: UpdateSettingDto): Promise<Setting> {
    const setting = await this.settingsRepository.findOne({ where: { id } });

    if (!setting) {
      throw new NotFoundException(`Setting no encontrado`);
    }

    if (!setting.isEditable) {
      throw new ConflictException(
        `El setting "${setting.key}" no es editable`,
      );
    }

    Object.assign(setting, updateSettingDto);
    const updated = await this.settingsRepository.save(setting);

    // Actualizar caché
    this.cache.set(updated.key, updated.value);

    return updated;
  }

  // ============================================
  // BULK UPDATE (múltiples settings a la vez)
  // ============================================
  async bulkUpdate(settings: Record<string, any>) {
    const updates: Promise<Setting>[] = [];

    for (const [key, value] of Object.entries(settings)) {
      const setting = await this.settingsRepository.findOne({
        where: { key },
      });

      if (!setting) {
        this.logger.warn(`Setting "${key}" no existe, saltando`);
        continue;
      }

      if (!setting.isEditable) {
        this.logger.warn(`Setting "${key}" no es editable, saltando`);
        continue;
      }

      setting.value = value;
      updates.push(this.settingsRepository.save(setting));

      // Actualizar caché
      this.cache.set(key, value);
    }

    return Promise.all(updates);
  }

  // ============================================
  // DELETE
  // ============================================
  async remove(id: string): Promise<{ message: string }> {
    const setting = await this.settingsRepository.findOne({ where: { id } });

    if (!setting) {
      throw new NotFoundException(`Setting no encontrado`);
    }

    if (!setting.isEditable) {
      throw new ConflictException(
        `El setting "${setting.key}" no se puede eliminar`,
      );
    }

    await this.settingsRepository.remove(setting);
    this.cache.delete(setting.key);

    return { message: 'Setting eliminado correctamente' };
  }

  // ============================================
  // STATS
  // ============================================
  async getStats() {
    const total = await this.settingsRepository.count();

    const byGroup = await this.settingsRepository
      .createQueryBuilder('setting')
      .select('setting.group', 'group')
      .addSelect('COUNT(*)', 'count')
      .groupBy('setting.group')
      .getRawMany();

    return {
      total,
      byGroup,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Refrescar caché manualmente
   */
  async refreshCache() {
    await this.loadCache();
    return { message: 'Caché actualizado', size: this.cache.size };
  }
}