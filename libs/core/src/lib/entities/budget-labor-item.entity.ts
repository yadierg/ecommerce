// libs/core/src/lib/entities/budget-labor-item.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Budget } from './budget.entity';

@Entity({ name: 'budget_labor_items' })
export class BudgetLaborItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'budget_id' })
  @Index()
  budgetId!: string;

  @ManyToOne(() => Budget, (budget) => budget.laborItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'budget_id' })
  budget!: Budget;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'worker_role' })
  @Index()
  workerRole!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'estimated_hours' })
  estimatedHours!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'hourly_rate' })
  hourlyRate!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'int', default: 1 })
  order!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}