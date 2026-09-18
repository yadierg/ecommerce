// apps/admin-api/src/modules/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario registrado' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refrescar access token' })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.refreshToken(dto.refreshToken, ipAddress, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar todas las sesiones' })
  logoutAll(@CurrentUser('id') userId: string) {
    return this.authService.logoutAll(userId);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ver sesiones activas' })
  getSessions(@CurrentUser('id') userId: string) {
    return this.authService.getSessions(userId);
  }
}