// apps/admin-api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const port = configService.get<number>('ADMIN_PORT', 3004);

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    credentials: true,
  });

  // Swagger
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Admin API')
      .setDescription('API de administración de ecommerce')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('users', 'Gestión de usuarios')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    logger.log(`📚 Swagger: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  logger.log(`🚀 Admin API corriendo en: http://localhost:${port}`);
}

bootstrap();