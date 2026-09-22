// libs/auth/src/lib/guards/tenant.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const headerTenantId = request.headers['x-tenant-id'];

    // Super admin puede especificar cualquier tenant
    if (user?.roles?.includes('super_admin')) {
      if (headerTenantId) {
        request.tenantId = headerTenantId;
      }
      return true;
    }

    // Usuario normal solo puede acceder a su propio tenant
    const tenantId = user?.tenantId || headerTenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant no especificado');
    }

    request.tenantId = tenantId;
    return true;
  }
}