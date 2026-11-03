// apps/inventory-api/src/modules/attribute-definitions/attribute-definitions.controller.ts
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
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Roles, CurrentUser } from '@ecommerce/auth';
import { AttributeDefinitionsService } from './attribute-definitions.service';
import { CreateAttributeDefinitionDto } from './dto/create-attribute-definition.dto';
import { UpdateAttributeDefinitionDto } from './dto/update-attribute-definition.dto';
import { QueryAttributeDefinitionDto } from './dto/query-attribute-definition.dto';

@ApiTags('attribute-definitions')
@Controller('attribute-definitions')
export class AttributeDefinitionsController {
  constructor(
    private readonly service: AttributeDefinitionsService,
  ) {}

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
  @Roles('super_admin', 'admin', 'inventory_manager')
  @ApiOperation({ summary: 'Crear definición de atributo' })
  create(
    @Body() dto: CreateAttributeDefinitionDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.create(dto, tenantId);
  }

  // ============================================
  // LIST
  // ============================================
  @Get()
  @Roles(
    'super_admin',
    'admin',
    'inventory_manager',
    'store_manager',
    'budget_manager',
  )
  @ApiOperation({ summary: 'Listar definiciones de atributos' })
  findAll(
    @Query() query: QueryAttributeDefinitionDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.findAll(query, tenantId);
  }

  // ============================================
  // BY PRODUCT TYPE
  // ============================================
  @Get('type/:productTypeId')
  @Roles(
    'super_admin',
    'admin',
    'inventory_manager',
    'store_manager',
    'budget_manager',
  )
  @ApiOperation({ summary: 'Atributos por tipo de producto' })
  @ApiParam({ name: 'productTypeId', description: 'UUID del tipo de producto' })
  findByProductType(
    @Param('productTypeId', new ParseUUIDPipe()) productTypeId: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.findByProductType(productTypeId, tenantId);
  }

  // ============================================
  // FIND ONE
  // ============================================
  @Get(':id')
  @Roles('super_admin', 'admin', 'inventory_manager')
  @ApiOperation({ summary: 'Obtener atributo por ID' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.findOne(id, tenantId);
  }

  // ============================================
  // UPDATE
  // ============================================
  @Patch(':id')
  @Roles('super_admin', 'admin', 'inventory_manager')
  @ApiOperation({ summary: 'Actualizar atributo' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAttributeDefinitionDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.update(id, dto, tenantId);
  }

  // ============================================
  // DELETE
  // ============================================
  @Delete(':id')
  @Roles('super_admin', 'admin', 'inventory_manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar atributo' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.service.remove(id, tenantId);
  }
}