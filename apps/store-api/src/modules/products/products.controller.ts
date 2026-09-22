// apps/store-api/src/modules/products/products.controller.ts
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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

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

  @Post()
  @ApiOperation({ summary: 'Crear producto' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.productsService.create(dto, tenantId);
  }

  @Public()
  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Listar productos' })
  findAll(
    @Query() query: QueryProductDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.productsService.findAll(query, tenantId);
  }

  @Public()
  @Get('featured')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Productos destacados' })
  findFeatured(
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Query('limit') limit?: number,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.productsService.findFeatured(tenantId, limit || 10);
  }

  @Public()
  @Get('brands')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Marcas' })
  getBrands(
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.productsService.getBrands(tenantId);
  }

  @Public()
  @Get('stats')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Estadísticas' })
  getStats(
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.productsService.getStats(tenantId);
  }

  @Public()
  @Get('slug/:slug')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Por slug' })
  findBySlug(
    @Param('slug') slug: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.productsService.findBySlug(slug, tenantId);
  }

  @Public()
  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Por ID' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.productsService.findOne(id, tenantId);
  }

  @Public()
  @Get(':id/related')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Relacionados' })
  findRelated(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Query('limit') limit?: number,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.productsService.findRelated(id, tenantId, limit || 5);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.productsService.update(id, dto, tenantId);
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Actualizar stock' })
  updateStock(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('quantity') quantity: number,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.productsService.updateStock(id, quantity, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('tenantId') userTenantId: string | null,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = this.resolveTenantId(userTenantId, headerTenantId);
    return this.productsService.remove(id, tenantId);
  }
}