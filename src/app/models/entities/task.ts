import { ValidationError } from './validation-error';

export type TaskStatus = 'todo' | 'doing' | 'done';

/** Ordem das colunas do quadro (fonte única dos status). */
export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'doing', 'done'];

export const TASK_STATUS_LABELS: Readonly<Record<TaskStatus, string>> = {
  todo: 'A fazer',
  doing: 'Em andamento',
  done: 'Concluído',
};

export type TaskPriority = 'low' | 'medium' | 'high';

export const TASK_PRIORITIES: readonly TaskPriority[] = ['low', 'medium', 'high'];

export const TASK_PRIORITY_LABELS: Readonly<Record<TaskPriority, string>> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

/** Mantenha igual às regras de supabase/schema.sql. */
export const TASK_LIMITS = { titleMax: 120, descriptionMax: 2000 } as const;

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Prazo no formato AAAA-MM-DD, ou `null` sem prazo. */
  dueDate: string | null;
  position: number;
  createdAt: string;
}

export interface TaskInput {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string | null;
}

export interface TaskPosition {
  id: string;
  status: TaskStatus;
  position: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateTaskInput(input: TaskInput): TaskInput {
  const title = input.title.trim();
  const description = input.description.trim();
  const dueDate = input.dueDate?.trim() || null;

  if (!title) {
    throw new ValidationError('O título é obrigatório.');
  }
  if (title.length > TASK_LIMITS.titleMax) {
    throw new ValidationError(`O título deve ter no máximo ${TASK_LIMITS.titleMax} caracteres.`);
  }
  if (description.length > TASK_LIMITS.descriptionMax) {
    throw new ValidationError(
      `A descrição deve ter no máximo ${TASK_LIMITS.descriptionMax} caracteres.`,
    );
  }
  if (!TASK_PRIORITIES.includes(input.priority)) {
    throw new ValidationError('Prioridade inválida.');
  }
  if (dueDate && !DATE_PATTERN.test(dueDate)) {
    throw new ValidationError('Prazo inválido.');
  }
  return { title, description, priority: input.priority, dueDate };
}

/** Data local de hoje no formato AAAA-MM-DD (mesmo formato do prazo). */
export function todayKey(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export type DueState = 'overdue' | 'today' | 'upcoming';

/** Situação do prazo. Tarefa concluída ou sem prazo não tem alerta (`null`). */
export function dueState(task: Task, today: string): DueState | null {
  if (!task.dueDate || task.status === 'done') {
    return null;
  }
  if (task.dueDate < today) {
    return 'overdue';
  }
  return task.dueDate === today ? 'today' : 'upcoming';
}

export type TaskFilter = 'all' | 'today' | 'overdue' | 'high';

export const TASK_FILTERS: readonly TaskFilter[] = ['all', 'today', 'overdue', 'high'];

export const TASK_FILTER_LABELS: Readonly<Record<TaskFilter, string>> = {
  all: 'Todas',
  today: 'Para hoje',
  overdue: 'Atrasadas',
  high: 'Alta prioridade',
};

/** Diz se a tarefa entra no filtro rápido escolhido. */
export function matchesFilter(task: Task, filter: TaskFilter, today: string): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'today':
      return dueState(task, today) === 'today';
    case 'overdue':
      return dueState(task, today) === 'overdue';
    case 'high':
      return task.priority === 'high' && task.status !== 'done';
  }
}

/** Busca no título e na descrição, sem diferenciar maiúsculas nem acentos. */
export function matchesSearch(task: Task, search: string): boolean {
  const term = normalize(search.trim());
  return !term || normalize(`${task.title} ${task.description}`).includes(term);
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Tarefas de uma coluna, na ordem em que aparecem. */
export function tasksByStatus(tasks: readonly Task[], status: TaskStatus): Task[] {
  return tasks.filter((task) => task.status === status).sort((a, b) => a.position - b.position);
}

/** Posição para uma tarefa nova entrar no fim da coluna. */
export function nextPosition(tasks: readonly Task[], status: TaskStatus): number {
  return tasksByStatus(tasks, status).reduce((max, task) => Math.max(max, task.position + 1), 0);
}

/**
 * Move uma tarefa para `toStatus` no índice `toIndex` e renumera as colunas afetadas.
 * Não altera a lista original.
 */
export function moveTask(
  tasks: readonly Task[],
  taskId: string,
  toStatus: TaskStatus,
  toIndex: number,
): Task[] {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new ValidationError('Tarefa não encontrada.');
  }

  const target = tasksByStatus(tasks, toStatus).filter((item) => item.id !== taskId);
  const index = Math.max(0, Math.min(toIndex, target.length));
  target.splice(index, 0, { ...task, status: toStatus });

  const renumbered = new Map<string, Task>();
  target.forEach((item, position) => renumbered.set(item.id, { ...item, position }));

  if (task.status !== toStatus) {
    tasksByStatus(tasks, task.status)
      .filter((item) => item.id !== taskId)
      .forEach((item, position) => renumbered.set(item.id, { ...item, position }));
  }

  return tasks.map((item) => renumbered.get(item.id) ?? item);
}

/** Só as tarefas que mudaram de coluna ou de posição (o que precisa ir para o banco). */
export function changedPositions(before: readonly Task[], after: readonly Task[]): TaskPosition[] {
  const previous = new Map(before.map((task) => [task.id, task]));
  return after
    .filter((task) => {
      const old = previous.get(task.id);
      return !old || old.status !== task.status || old.position !== task.position;
    })
    .map(({ id, status, position }) => ({ id, status, position }));
}
