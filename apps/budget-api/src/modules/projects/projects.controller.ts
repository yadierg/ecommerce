// apps/budget-api/src/modules/projects/projects.controller.ts
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
import { ProjectStatus } from '@ecommerce/core';
import { ProjectsService } from './projects.service';
import { ConvertBudgetToProjectDto } from './dto/convert-budget-to-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { CompleteProjectDto } from './dto/complete-project.dto';
import { CancelProjectDto } from './dto/cancel-project.dto';

@ApiTags('projects')
@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

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
  // CONVERT BUDGET → PROJECT
  // ============================================
  @Post('budgets/:budgetId/convert-to-project')
  @ApiOperation({ summary: 'Convertir presupuesto aprobado en proyecto' })
  convertFromBudget(
    @Param('budgetId', new ParseUUIDPipe()) budgetId: string,
    @Body() dto: ConvertBudgetToProjectDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('id') userId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.projectsService.convertFromBudget(
      budgetId,
      dto,
      tenantId,
      userId,
    );
  }

  // ============================================
  // READ ALL
  // ============================================
  @Public()
  @Get('projects')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Listar proyectos' })
  findAll(
    @Query() query: QueryProjectDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.projectsService.findAll(query, tenantId);
  }

  // ============================================
  // STATS
  // ============================================
  @Public()
  @Get('projects/stats')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Estadísticas' })
  getStats(
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.projectsService.getStats(tenantId);
  }

  // ============================================
  // BY NUMBER
  // ============================================
  @Public()
  @Get('projects/number/:projectNumber')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Buscar por número' })
  findByNumber(
    @Param('projectNumber') projectNumber: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.projectsService.findByNumber(projectNumber, tenantId);
  }

  // ============================================
  // BY ID
  // ============================================
  @Public()
  @Get('projects/:id')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Obtener por ID' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.projectsService.findOne(id, tenantId);
  }

  // ============================================
  // UPDATE
  // ============================================
  @Patch('projects/:id')
  @ApiOperation({ summary: 'Actualizar' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.projectsService.update(id, dto, tenantId);
  }

  // ============================================
  // START
  // ============================================
  @Post('projects/:id/start')
  @ApiOperation({ summary: 'Iniciar proyecto (planning → in_progress)' })
  start(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.projectsService.start(id, tenantId);
  }

  // ============================================
  // PAUSE
  // ============================================
  @Post('projects/:id/pause')
  @ApiOperation({ summary: 'Pausar proyecto' })
  pause(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.projectsService.pause(id, tenantId);
  }

  // ============================================
  // RESUME
  // ============================================
  @Post('projects/:id/resume')
  @ApiOperation({ summary: 'Reanudar proyecto' })
  resume(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.projectsService.resume(id, tenantId);
  }

  // ============================================
  // COMPLETE
  // ============================================
  @Post('projects/:id/complete')
  @ApiOperation({ summary: 'Completar proyecto' })
  complete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CompleteProjectDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('id') userId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.projectsService.complete(id, tenantId, userId, dto.closeNotes);
  }

  // ============================================
  // CANCEL
  // ============================================
  @Post('projects/:id/cancel')
  @ApiOperation({ summary: 'Cancelar proyecto' })
  cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CancelProjectDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.projectsService.cancel(id, tenantId, dto.reason);
  }

  // ============================================
  // DELETE
  // ============================================
  @Delete('projects/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar (solo planning)' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.projectsService.remove(id, tenantId);
  }
}