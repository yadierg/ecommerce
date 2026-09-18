// apps/admin-api/src/modules/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear notificación' })
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Enviar notificación a todos los admins' })
  broadcast(@Body() dto: CreateNotificationDto) {
    const { userId, ...rest } = dto;
    return this.notificationsService.notifyAll(rest);
  }

  @Get()
  @ApiOperation({ summary: 'Listar mis notificaciones' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationsService.findAll(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Contar no leídas' })
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de notificaciones' })
  getStats(@CurrentUser('id') userId: string) {
    return this.notificationsService.getStats(userId);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar todas como leídas' })
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar como leída' })
  markAsRead(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Delete('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar todas las leídas' })
  deleteAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.deleteAllRead(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar notificación' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.remove(id, userId);
  }
}
