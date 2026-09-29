// apps/budget-api/src/modules/claims/claims.controller.ts
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
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { QueryClaimDto } from './dto/query-claim.dto';
import { ResolveClaimDto } from './dto/resolve-claim.dto';
import { RejectClaimDto } from './dto/reject-claim.dto';

@ApiTags('claims')
@Controller('warranties/:warrantyId/claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

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
  @ApiOperation({ summary: 'Crear reclamo de garantía' })
  create(
    @Param('warrantyId', new ParseUUIDPipe()) warrantyId: string,
    @Body() dto: CreateClaimDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('id') userId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.claimsService.create(warrantyId, dto, tenantId, userId);
  }

  // ============================================
  // READ ALL
  // ============================================
  @Public()
  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Listar reclamos' })
  findAll(
    @Param('warrantyId', new ParseUUIDPipe()) warrantyId: string,
    @Query() query: QueryClaimDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.claimsService.findAll(warrantyId, query, tenantId);
  }

  // ============================================
  // STATS
  // ============================================
  @Public()
  @Get('stats')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Estadísticas' })
  getStats(
    @Param('warrantyId', new ParseUUIDPipe()) warrantyId: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.claimsService.getStats(warrantyId, tenantId);
  }

  // ============================================
  // BY ID
  // ============================================
  @Public()
  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Obtener por ID' })
  findOne(
    @Param('warrantyId', new ParseUUIDPipe()) warrantyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.claimsService.findOne(id, warrantyId, tenantId);
  }

  // ============================================
  // UPDATE
  // ============================================
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar reclamo' })
  update(
    @Param('warrantyId', new ParseUUIDPipe()) warrantyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClaimDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.claimsService.update(id, dto, warrantyId, tenantId);
  }

  // ============================================
  // START REVIEW
  // ============================================
  @Post(':id/review')
  @ApiOperation({ summary: 'Iniciar revisión (open → in_review)' })
  startReview(
    @Param('warrantyId', new ParseUUIDPipe()) warrantyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.claimsService.startReview(id, warrantyId, tenantId);
  }

  // ============================================
  // APPROVE
  // ============================================
  @Post(':id/approve')
  @ApiOperation({ summary: 'Aprobar reclamo' })
  approve(
    @Param('warrantyId', new ParseUUIDPipe()) warrantyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.claimsService.approve(id, warrantyId, tenantId);
  }

  // ============================================
  // REJECT
  // ============================================
  @Post(':id/reject')
  @ApiOperation({ summary: 'Rechazar reclamo' })
  reject(
    @Param('warrantyId', new ParseUUIDPipe()) warrantyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RejectClaimDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('id') userId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.claimsService.reject(id, dto.reason, warrantyId, tenantId, userId);
  }

  // ============================================
  // RESOLVE
  // ============================================
  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolver reclamo' })
  resolve(
    @Param('warrantyId', new ParseUUIDPipe()) warrantyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResolveClaimDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @CurrentUser('id') userId: string,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.claimsService.resolve(id, dto, warrantyId, tenantId, userId);
  }

  // ============================================
  // CANCEL
  // ============================================
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar reclamo' })
  cancel(
    @Param('warrantyId', new ParseUUIDPipe()) warrantyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.claimsService.cancel(id, warrantyId, tenantId);
  }

  // ============================================
  // DELETE
  // ============================================
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar (solo open)' })
  remove(
    @Param('warrantyId', new ParseUUIDPipe()) warrantyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.claimsService.remove(id, warrantyId, tenantId);
  }
}