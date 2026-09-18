// apps/admin-api/src/common/interceptors/audit.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user, ip, headers } = request;
    const startTime = Date.now();

    // Mapear método HTTP a acción
    const actionMap: Record<string, string> = {
      POST: 'create',
      GET: 'view',
      PATCH: 'update',
      PUT: 'update',
      DELETE: 'delete',
    };

    const action = actionMap[method] || method.toLowerCase();

    // Extraer entidad de la URL (/users/xxx → users)
    const urlParts = url.split('/').filter(Boolean);
    const entity = urlParts[0] || 'unknown';
    const entityId = urlParts[1] || null;

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Solo guardar si es operación de escritura o vista de un recurso específico
          if (['create', 'update', 'delete'].includes(action) || entityId) {
            this.auditService
              .log({
                userId: user?.id || null,
                action,
                entity,
                entityId,
                changes: method === 'GET' ? null : body,
                ipAddress: ip || request.connection?.remoteAddress,
                userAgent: headers['user-agent'],
                statusCode: 200,
                durationMs: Date.now() - startTime,
              })
              .catch((err) =>
                this.logger.error(`Error en audit log: ${err.message}`),
              );
          }
        },
        error: (error) => {
          // Guardar también los errores
          this.auditService
            .log({
              userId: user?.id || null,
              action: `${action}_failed`,
              entity,
              entityId,
              changes: body,
              ipAddress: ip || request.connection?.remoteAddress,
              userAgent: headers['user-agent'],
              statusCode: error.status || 500,
              description: error.message,
              durationMs: Date.now() - startTime,
            })
            .catch((err) =>
              this.logger.error(`Error en audit log: ${err.message}`),
            );
        },
      }),
    );
  }
}