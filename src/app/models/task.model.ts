import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import {
  Task,
  TaskInput,
  TaskPosition,
  TaskPriority,
  TaskStatus,
  validateTaskInput,
} from './entities/task';

const TABLE = 'tasks';
const COLUMNS = 'id, title, description, status, priority, due_date, position, created_at';

interface TaskRow {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  position: number;
  created_at: string;
}

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

/** Model: dados e regras das tarefas. É a única camada que fala com o banco. */
@Injectable({ providedIn: 'root' })
export class TaskModel {
  private readonly db = inject(SUPABASE_CLIENT);

  async list(): Promise<Task[]> {
    const result = await this.db.from(TABLE).select(COLUMNS).order('position');
    return unwrap<TaskRow[]>(result).map(toTask);
  }

  async create(input: TaskInput, status: TaskStatus, position: number): Promise<Task> {
    const row = toRow(validateTaskInput(input));
    const result = await this.db
      .from(TABLE)
      .insert({ ...row, status, position })
      .select(COLUMNS)
      .single();
    return toTask(unwrap<TaskRow>(result));
  }

  async update(id: string, input: TaskInput): Promise<Task> {
    const row = toRow(validateTaskInput(input));
    const result = await this.db.from(TABLE).update(row).eq('id', id).select(COLUMNS).single();
    return toTask(unwrap<TaskRow>(result));
  }

  async remove(id: string): Promise<void> {
    const result = await this.db.from(TABLE).delete().eq('id', id);
    unwrap(result);
  }

  async savePositions(positions: readonly TaskPosition[]): Promise<void> {
    const results = await Promise.all(
      positions.map(({ id, status, position }) =>
        this.db.from(TABLE).update({ status, position }).eq('id', id),
      ),
    );
    results.forEach((result) => unwrap(result));
  }
}

function unwrap<T>({ data, error }: QueryResult<unknown>): T {
  if (error) {
    throw new Error(error.message);
  }
  return data as T;
}

function toRow({ title, description, priority, dueDate }: TaskInput) {
  return { title, description, priority, due_date: dueDate };
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    status: row.status,
    priority: row.priority ?? 'medium',
    dueDate: row.due_date ?? null,
    position: row.position,
    createdAt: row.created_at,
  };
}
