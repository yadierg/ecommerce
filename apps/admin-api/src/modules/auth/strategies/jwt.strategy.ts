// apps/admin-api/src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Usuario no válido');
    }

    // Este objeto se adjunta a request.user
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roles: payload.roles,
      permissions: payload.permissions,
    };
  }
}