// apps/admin-api/src/modules/settings/settings.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { BulkUpdateSettingsDto } from './dto/bulk-update-settings.dto';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un setting' })
  @ApiResponse({ status: 201, description: 'Setting creado' })
  @ApiResponse({ status: 409, description: 'Setting ya existe' })
  create(@Body() createSettingDto: CreateSettingDto) {
    return this.settingsService.create(createSettingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los settings' })
  findAll(@Query('group') group?: string) {
    return this.settingsService.findAll(group);
  }

  @Get('public')
  @ApiOperation({ summary: 'Settings públicos (para frontend)' })
  findPublic() {
    return this.settingsService.findPublic();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de settings' })
  getStats() {
    return this.settingsService.getStats();
  }

  @Get('group/:group')
  @ApiOperation({ summary: 'Settings por grupo' })
  @ApiParam({ name: 'group', example: 'general' })
  findByGroup(@Param('group') group: string) {
    return this.settingsService.findByGroup(group);
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Obtener setting por key' })
  @ApiParam({ name: 'key', example: 'site_name' })
  findByKey(@Param('key') key: string) {
    return this.settingsService.findByKey(key);
  }

  @Patch('bulk')
  @ApiOperation({ summary: 'Actualizar múltiples settings' })
  bulkUpdate(@Body() bulkUpdateDto: BulkUpdateSettingsDto) {
    return this.settingsService.bulkUpdate(bulkUpdateDto.settings);
  }

  @Post('refresh-cache')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refrescar caché de settings' })
  refreshCache() {
    return this.settingsService.refreshCache();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un setting' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateSettingDto: UpdateSettingDto,
  ) {
    return this.settingsService.update(id, updateSettingDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un setting' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.settingsService.remove(id);
  }
}