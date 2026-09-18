// apps/admin-api/src/modules/permissions/permissions.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';

@ApiTags('permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear permiso' })
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar permisos' })
  findAll(@Query('resource') resource?: string) {
    return this.permissionsService.findAll(resource);
  }

  @Get('grouped')
  @ApiOperation({ summary: 'Permisos agrupados por recurso' })
  getGrouped() {
    return this.permissionsService.getGrouped();
  }

  @Get('resources')
  @ApiOperation({ summary: 'Lista de recursos disponibles' })
  getResources() {
    return this.permissionsService.getResources();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener permiso por ID' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.permissionsService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar permiso' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.permissionsService.remove(id);
  }
}