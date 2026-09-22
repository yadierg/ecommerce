// apps/admin-api/src/modules/users/users.controller.ts
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
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, Roles } from '@ecommerce/auth';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Crear usuario' })
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('isSuperAdmin') isSuperAdmin: boolean,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    // Super admin: puede usar header o el tenantId del body
    // Admin normal: solo su propio tenantId
    const tenantId = isSuperAdmin
      ? (headerTenantId || userTenantId)
      : userTenantId;

    return this.usersService.create(
      createUserDto,
      tenantId || undefined,
      isSuperAdmin,
    );
  }

  @Get()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Listar usuarios' })
  findAll(
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('isSuperAdmin') isSuperAdmin: boolean,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    // Super admin sin header → ver TODOS
    // Super admin con header → filtrar por tenant
    // Admin normal → solo su tenant
    const tenantId = isSuperAdmin
      ? (headerTenantId || undefined)
      : (userTenantId || undefined);

    return this.usersService.findAll(tenantId, isSuperAdmin);
  }

  @Get('stats')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Estadísticas' })
  getStats(
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('isSuperAdmin') isSuperAdmin: boolean,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = isSuperAdmin
      ? (headerTenantId || undefined)
      : (userTenantId || undefined);

    return this.usersService.getStats(tenantId, isSuperAdmin);
  }

  @Get(':id')
  @Roles('admin', 'super_admin')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/toggle-active')
  @Roles('admin', 'super_admin')
  toggleActive(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.toggleActive(id);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.remove(id);
  }
}