// apps/budget-api/src/modules/workers/workers.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  Public,
  CurrentUser,
  OptionalJwtGuard,
} from '@ecommerce/auth';
import { WorkersService } from './workers.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { QueryWorkerDto } from './dto/query-worker.dto';

@ApiTags('workers')
@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  private resolveTenantId(
    userTenantId?: string | null,
    headerTenantId?: string,
  ): string {
    const tenantId = userTenantId || headerTenantId;

    if (!tenantId) {
      throw new BadRequestException(
        'Tenant no especificado. Envía el header "x-tenant-id" o autentícate.',
      );
    }

    return tenantId;
  }

  // ============================================
  // CREATE
  // ============================================
  @Post()
  @ApiOperation({ summary: 'Crear worker' })
  create(
    @Body() dto: CreateWorkerDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.workersService.create(dto, tenantId);
  }

  // ============================================
  // READ ALL
  // ============================================
  @Public()
  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Listar workers' })
  findAll(
    @Query() query: QueryWorkerDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.workersService.findAll(query, tenantId);
  }

  // ============================================
  // AVAILABLE
  // ============================================
  @Public()
  @Get('available')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Workers disponibles' })
  findAvailable(
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Query('role') role?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.workersService.findAvailable(tenantId, role);
  }

  // ============================================
  // BY SPECIALTY
  // ============================================
  @Public()
  @Get('specialty/:specialty')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Workers por especialidad' })
  findBySpecialty(
    @Param('specialty') specialty: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.workersService.findBySpecialty(tenantId, specialty);
  }

  // ============================================
  // STATS
  // ============================================
  @Public()
  @Get('stats')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Estadísticas' })
  getStats(
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.workersService.getStats(tenantId);
  }

  // ============================================
  // BY ID
  // ============================================
  @Public()
  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Obtener por ID' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.workersService.findOne(id, tenantId);
  }

  // ============================================
  // UPDATE
  // ============================================
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWorkerDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.workersService.update(id, dto, tenantId);
  }

  // ============================================
  // SET AVAILABILITY
  // ============================================
  @Patch(':id/availability')
  @ApiOperation({ summary: 'Cambiar disponibilidad' })
  setAvailability(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('isAvailable') isAvailable: boolean,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.workersService.setAvailability(id, isAvailable, tenantId);
  }

  // ============================================
  // DELETE
  // ============================================
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.workersService.remove(id, tenantId);
  }
}