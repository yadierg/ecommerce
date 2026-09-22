// apps/admin-api/src/modules/tenants/tenants.controller.ts
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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles, CurrentUser } from '@ecommerce/auth';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: 'Crear tenant (solo super_admin)' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @Roles('super_admin')
  @ApiOperation({ summary: 'Listar todos los tenants (solo super_admin)' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get('stats')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Estadísticas (solo super_admin)' })
  getStats() {
    return this.tenantsService.getStats();
  }

  @Get('slug/:slug')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Obtener por slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.tenantsService.findBySlug(slug);
  }

  @Get(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Obtener tenant por ID' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tenantsService.findOne(id);
  }

  @Get(':id/users')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Usuarios del tenant' })
  getUsers(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tenantsService.getUsers(id);
  }

  @Patch(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Actualizar tenant' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar tenant' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tenantsService.remove(id);
  }
}