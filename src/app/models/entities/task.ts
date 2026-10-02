import { ValidationError } from './validation-error';

export type TaskStatus = 'todo' | 'doing' | 'done';

/** Ordem das colunas do quadro (fonte única dos status). */
export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'doing', 'done'];

export const TASK_STATUS_LABELS: Readonly<Record<TaskStatus, string>> = {
  todo: 'A fazer',
  doing: 'Em andamento',
  done: 'Concluído',
};

/** Mantenha igual às regras de supabase/schema.sql. */
export const TASK_LIMITS = { titleMax: 120, descriptionMax: 2000 } as const;

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  position: number;
  createdAt: string;
}

export interface TaskInput {
  title: string;
  description: string;
}

export interface TaskPosition {
  id: string;
  status: TaskStatus;
  position: number;
}

export function validateTaskInput(input: TaskInput): TaskInput {
  const title = input.title.trim();
  const description = input.description.trim();

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
  return { title, description };
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
