// libs/core/src/lib/entities/setting.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'settings' })
export class Setting {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @Index()
  key!: string;

  @Column({ type: 'jsonb' })
  value: any;

  @Column()
  @Index()
  group!: string; // general, email, payment, shipping, tax

  @Column({ nullable: true })
  description!: string;

  @Column({ default: 'string' })
  type!: string; // string, number, boolean, json, array

  @Column({ default: true, name: 'is_public' })
  isPublic!: boolean; // Si es visible públicamente

  @Column({ default: false, name: 'is_editable' })
  isEditable!: boolean; // Si se puede editar desde el panel

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}