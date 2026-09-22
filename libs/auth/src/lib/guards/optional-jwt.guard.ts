// libs/auth/src/lib/guards/optional-jwt.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    // Siempre intenta validar el JWT si está presente
    return super.canActivate(context);
  }

  override handleRequest(err: any, user: any) {
    // Si falla la validación, NO lanzar error → user = null
    return user || null;
  }
}