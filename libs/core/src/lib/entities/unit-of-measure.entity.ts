// libs/core/src/lib/entities/unit-of-measure.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Product } from './product.entity';

export enum UnitType {
  UNIT = 'unit',             // unidades discretas (unidades, cajas, pares)
  LENGTH = 'length',         // longitud (m, cm, mm, km)
  AREA = 'area',             // área (m², cm², ha)
  VOLUME = 'volume',         // volumen (L, mL, m³)
  WEIGHT = 'weight',         // peso (kg, g, ton)
  TIME = 'time',             // tiempo (hora, día)
  SERVICE = 'service',       // servicio
  OTHER = 'other',
}

@Entity({ name: 'units_of_measure' })
export class UnitOfMeasure {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ============================================
  // MULTI-TENANT
  // ============================================
  @Column({ name: 'tenant_id', nullable: true })
  @Index()
  tenantId?: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  // ============================================
  // IDENTIFICACIÓN
  // ============================================
  @Column()
  @Index()
  name!: string;              // "Metro", "Kilogramo", "Caja"

  @Column()
  @Index()
  abbreviation!: string;      // "m", "kg", "box"

  @Column({ nullable: true })
  nameEn?: string;            // "Meter", "Kilogram", "Box" (para i18n)

  @Column({ nullable: true, name: 'name_en' })
  description?: string;

  // ============================================
  // CLASIFICACIÓN
  // ============================================
  @Column({
    type: 'enum',
    enum: UnitType,
    default: UnitType.UNIT,
  })
  @Index()
  type!: UnitType;

  // ============================================
  // CONFIGURACIÓN
  // ============================================
  @Column({
    type: 'int',
    default: 0,
    name: 'decimal_places',
    comment: 'Decimales permitidos (0 = solo enteros)',
  })
  decimalPlaces!: number;

  @Column({
    default: true,
    name: 'is_active',
  })
  @Index()
  isActive!: boolean;

  @Column({
    default: false,
    name: 'is_system',
    comment: 'Unidades del sistema no se pueden eliminar',
  })
  isSystem!: boolean;

  @Column({ type: 'int', default: 0 })
  @Index()
  order!: number;

  // ============================================
  // RELACIONES
  // ============================================
  @OneToMany(() => Product, (product) => product.unitOfMeasure)
  products?: Product[];

  // ============================================
  // AUDITORÍA
  // ============================================
  @Column({ name: 'created_by_id', nullable: true })
  createdById?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}