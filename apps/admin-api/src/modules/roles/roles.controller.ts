// apps/admin-api/src/modules/roles/roles.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear rol' })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar roles' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de roles' })
  getStats() {
    return this.rolesService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener rol por ID' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar rol' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, dto);
  }

  @Patch(':id/permissions')
  @ApiOperation({ summary: 'Asignar permisos a un rol' })
  assignPermissions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.rolesService.assignPermissions(id, permissionIds);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar rol' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.rolesService.remove(id);
  }
}