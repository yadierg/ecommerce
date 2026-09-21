// apps/admin-api/src/modules/notifications/dto/create-notification.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { NotificationType, NotificationPriority } from '@ecommerce/core';

export class CreateNotificationDto {
  @ApiProperty({ required: false, description: 'null = global' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ example: 'Nuevo pedido' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Se ha creado el pedido #1234' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    enum: NotificationType,
    default: NotificationType.INFO,
    required: false,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiProperty({
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
    required: false,
  })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @ApiProperty({ required: false, example: 'order' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false, type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  actionUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  actionLabel?: string;
}
