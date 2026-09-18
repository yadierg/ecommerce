// apps/admin-api/src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los usuarios' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de usuarios' })
  getStats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Activar/Desactivar usuario' })
  toggleActive(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.toggleActive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar usuario' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.remove(id);
  }
}