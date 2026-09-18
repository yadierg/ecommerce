// apps/admin-api/src/modules/audit/audit.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Listar logs de auditoría con filtros' })
  @ApiResponse({ status: 200, description: 'Lista de logs' })
  findAll(@Query() query: QueryAuditLogDto) {
    return this.auditService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de auditoría' })
  @ApiResponse({ status: 200, description: 'Estadísticas' })
  getStats() {
    return this.auditService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un log por ID' })
  @ApiParam({ name: 'id', description: 'UUID del log' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.auditService.findOne(id);
  }

  @Delete('clean')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Limpiar logs antiguos' })
  cleanOldLogs(@Query('days') days?: number) {
    return this.auditService.cleanOldLogs(days || 90);
  }
}