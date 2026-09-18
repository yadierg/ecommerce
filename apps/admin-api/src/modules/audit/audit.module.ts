// apps/admin-api/src/modules/audit/audit.module.ts
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../../entities/audit-log.entity';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Global() // ← Global para inyectar en cualquier módulo
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}