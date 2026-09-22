// libs/auth/src/lib/decorators/current-tenant.decorator.ts
import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    const headerTenantId = request.headers['x-tenant-id'];

    // Super admin puede especificar tenant vía header
    if (user?.isSuperAdmin && headerTenantId) {
      return data ? headerTenantId : { id: headerTenantId };
    }

    // Usuario normal: solo su propio tenant
    const tenantId = user?.tenantId;

    if (!tenantId) {
      throw new BadRequestException(
        'Tenant no especificado. Inicia sesión con una cuenta asociada a una empresa.',
      );
    }

    return data ? tenantId : { id: tenantId };
  },
);