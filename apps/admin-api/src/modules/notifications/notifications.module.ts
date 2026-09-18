// apps/admin-api/src/modules/notifications/notifications.module.ts
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../../entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Global() // ← Global para inyectar en otros módulos
@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
