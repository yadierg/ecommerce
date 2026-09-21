// apps/admin-api/src/modules/roles/roles.seeder.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, Permission } from '@ecommerce/core';

@Injectable()
export class RolesSeeder implements OnModuleInit {
  private readonly logger = new Logger(RolesSeeder.name);

  constructor(
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepo: Repository<Permission>,
  ) {}

  async onModuleInit() {
    await this.seedPermissions();
    await this.seedRoles();
  }

  private async seedPermissions() {
    const resources = ['users', 'products', 'orders', 'inventory', 'budgets', 'settings', 'audit'];
    const actions = ['create', 'read', 'update', 'delete'];

    let created = 0;

    for (const resource of resources) {
      for (const action of actions) {
        const name = `${resource}.${action}`;
        const exists = await this.permissionsRepo.findOne({ where: { name } });

        if (!exists) {
          await this.permissionsRepo.save(
            this.permissionsRepo.create({
              name,
              resource,
              action,
              category: 'system',
              description: `${action} en ${resource}`,
            }),
          );
          created++;
        }
      }
    }

    if (created > 0) {
      this.logger.log(`✅ ${created} permisos creados`);
    }
  }

  private async seedRoles() {
    const allPermissions = await this.permissionsRepo.find();

    const defaultRoles = [
      {
        name: 'super_admin',
        description: 'Super administrador con acceso total',
        isSystem: true,
        permissions: allPermissions,
      },
      {
        name: 'admin',
        description: 'Administrador',
        isSystem: true,
        permissions: allPermissions.filter(
          (p) => p.resource !== 'settings' || p.action !== 'delete',
        ),
      },
      {
        name: 'store_manager',
        description: 'Gerente de tienda',
        isSystem: true,
        permissions: allPermissions.filter((p) =>
          ['products', 'orders'].includes(p.resource),
        ),
      },
      {
        name: 'inventory_manager',
        description: 'Gerente de inventario',
        isSystem: true,
        permissions: allPermissions.filter((p) =>
          ['inventory', 'products'].includes(p.resource),
        ),
      },
      {
        name: 'budget_manager',
        description: 'Gerente de presupuestos',
        isSystem: true,
        permissions: allPermissions.filter((p) =>
          ['budgets'].includes(p.resource),
        ),
      },
      {
        name: 'user',
        description: 'Usuario básico',
        isSystem: true,
        permissions: allPermissions.filter((p) => p.action === 'read'),
      },
    ];

    let created = 0;

    for (const roleData of defaultRoles) {
      const exists = await this.rolesRepo.findOne({
        where: { name: roleData.name },
      });

      if (!exists) {
        await this.rolesRepo.save(
          this.rolesRepo.create({
            ...roleData,
            category: 'system',
          }),
        );
        created++;
      }
    }

    if (created > 0) {
      this.logger.log(`✅ ${created} roles por defecto creados`);
    }
  }
}