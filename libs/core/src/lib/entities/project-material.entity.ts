// libs/core/src/lib/entities/project-material.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from './project.entity';
import { Product } from './product.entity';
import { Warehouse } from './warehouse.entity';
import { Worker } from './worker.entity';

export enum ProjectMaterialStatus {
  PLANNED = 'planned',
  DELIVERED = 'delivered',
  PARTIALLY_USED = 'partially_used',
  RETURNED = 'returned',
  CONSUMED = 'consumed',
  LOST = 'lost',
}

@Entity({ name: 'project_materials' })
export class ProjectMaterial {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id' })
  @Index()
  projectId!: string;

  @ManyToOne(() => Project, (project) => project.materials, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  // ============================================
  // ORIGEN
  // ============================================
  @Column({ name: 'product_id', nullable: true })
  @Index()
  productId?: string;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Column({ name: 'warehouse_id' })
  @Index()
  warehouseId!: string;

  @ManyToOne(() => Warehouse, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: Warehouse;

  // ============================================
  // SNAPSHOT
  // ============================================
  @Column({ name: 'product_name' })
  productName!: string;

  @Column({ nullable: true, name: 'product_sku' })
  productSku?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'unit_price' })
  unitPrice!: number;

  // ============================================
  // CANTIDADES
  // ============================================
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'quantity_planned' })
  quantityPlanned!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'quantity_delivered' })
  quantityDelivered!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'quantity_used' })
  quantityUsed!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'quantity_returned' })
  quantityReturned!: number;

  // ============================================
  // ESTADO
  // ============================================
  @Column({
    type: 'enum',
    enum: ProjectMaterialStatus,
    default: ProjectMaterialStatus.PLANNED,
  })
  @Index()
  status!: ProjectMaterialStatus;

  // ============================================
  // ASIGNACIÓN
  // ============================================
  @Column({ name: 'assigned_to_worker_id', nullable: true })
  @Index()
  assignedToWorkerId?: string;

  @ManyToOne(() => Worker, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'assigned_to_worker_id' })
  assignedToWorker?: Worker;

  // ============================================
  // FECHAS
  // ============================================
  @Column({ type: 'timestamp', nullable: true, name: 'delivered_at' })
  deliveredAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'returned_at' })
  returnedAt?: Date;

  // ============================================
  // COSTOS
  // ============================================
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'cost_actual',
  })
  costActual!: number;

  // ============================================
  // EXTRAS
  // ============================================
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ============================================
  // TIMESTAMPS
  // ============================================
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}