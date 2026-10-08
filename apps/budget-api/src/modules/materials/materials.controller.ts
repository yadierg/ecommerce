// apps/budget-api/src/modules/materials/materials.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
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
import { MaterialsService } from './materials.service';
import { DeliverMaterialDto } from './dto/deliver-material.dto';
import { UseMaterialDto } from './dto/use-material.dto';
import { ReturnMaterialDto } from './dto/return-material.dto';
import { ReportLostDto } from './dto/report-lost.dto';

@ApiTags('materials')
@Controller('projects/:projectId/materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

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
  // READ ALL
  // ============================================
  @Public()
  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Listar materiales' })
  findAll(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Query('status') status?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.materialsService.findAll(projectId, tenantId, status);
  }

  // ============================================
  // STATS
  // ============================================
  @Public()
  @Get('stats')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Estadísticas' })
  getStats(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.materialsService.getStats(projectId, tenantId);
  }

  // ============================================
  // BY ID
  // ============================================
  @Public()
  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Obtener por ID' })
  findOne(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.materialsService.findOne(id, projectId, tenantId);
  }

  // ============================================
  // DELIVER
  // ============================================
  @Post(':id/deliver')
  @ApiOperation({ summary: 'Entregar material al worker (descuenta stock)' })
  deliver(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DeliverMaterialDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('id') userId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.materialsService.deliver(id, dto, projectId, tenantId, userId);
  }

  // ============================================
  // USE
  // ============================================
  @Patch(':id/use')
  @ApiOperation({ summary: 'Reportar uso de material' })
  use(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UseMaterialDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.materialsService.use(id, dto, projectId, tenantId);
  }

  // ============================================
  // RETURN
  // ============================================
  @Post(':id/return')
  @ApiOperation({ summary: 'Devolver sobrantes al almacén (suma stock)' })
  returnMaterial(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReturnMaterialDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('id') userId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.materialsService.returnMaterial(
      id,
      dto,
      projectId,
      tenantId,
      userId,
    );
  }

  // ============================================
  // REPORT LOST
  // ============================================
  @Post(':id/lost')
  @ApiOperation({ summary: 'Reportar pérdida/daño de material' })
  reportLost(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReportLostDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.materialsService.reportLost(id, dto, projectId, tenantId);
  }
}