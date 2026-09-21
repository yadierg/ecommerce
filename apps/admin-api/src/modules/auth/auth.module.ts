// apps/admin-api/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Session, Role } from '@ecommerce/core';
import { AuthModule as SharedAuthModule } from '@ecommerce/auth';  // ← IMPORTANTE
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, Role]),
    SharedAuthModule,  // ← Importar el módulo compartido (trae JwtService)
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}