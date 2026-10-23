import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    enum: [
      'super_admin',
      'admin',
      'store_manager',
      'inventory_manager',
      'budget_manager',
      'user',
    ],
    example: 'budget_manager',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'super_admin',
    'admin',
    'store_manager',
    'inventory_manager',
    'budget_manager',
    'user',
  ])
  role: string;
}