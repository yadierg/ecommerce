// libs/auth/src/lib/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
  tenantId?: string | null;
  isSuperAdmin?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // ✅ Ahora no depende de AuthService
    // Solo retorna el payload — la validación de usuario se hace en el interceptor
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      roles: payload.roles,
      permissions: payload.permissions,
      tenantId: payload.tenantId,         // ← NUEVO
      isSuperAdmin: payload.isSuperAdmin, // ← NUEVO
    };
  }
}
