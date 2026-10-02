import { computed, inject, Injectable, signal } from '@angular/core';
import { Notifier } from '../core/notifier';
import {
  changedPositions,
  moveTask,
  nextPosition,
  Task,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  TaskInput,
  TaskStatus,
  tasksByStatus,
} from '../models/entities/task';
import { TaskModel } from '../models/task.model';
import { errorMessage } from './error-message';

export interface BoardColumn {
  status: TaskStatus;
  label: string;
  tasks: Task[];
}

/**
 * Controller do quadro: recebe as ações da View, chama o Model e guarda o estado da tela.
 * Fornecido pela própria View do quadro, então o estado some ao sair dela.
 */
@Injectable()
export class TaskController {
  private readonly model = inject(TaskModel);
  private readonly notifier = inject(Notifier);

  readonly tasks = signal<Task[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly columns = computed<BoardColumn[]>(() =>
    TASK_STATUSES.map((status) => ({
      status,
      label: TASK_STATUS_LABELS[status],
      tasks: tasksByStatus(this.tasks(), status),
    })),
  );

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.tasks.set(await this.model.list());
    } catch (error) {
      this.fail(error, 'Não foi possível carregar as tarefas.');
    } finally {
      this.loading.set(false);
    }
  }

  create(input: TaskInput, status: TaskStatus = 'todo'): Promise<boolean> {
    return this.save('Tarefa criada.', 'Não foi possível criar a tarefa.', async () => {
      const task = await this.model.create(input, status, nextPosition(this.tasks(), status));
      this.tasks.update((tasks) => [...tasks, task]);
    });
  }

  update(id: string, input: TaskInput): Promise<boolean> {
    return this.save('Tarefa atualizada.', 'Não foi possível atualizar a tarefa.', async () => {
      const updated = await this.model.update(id, input);
      this.tasks.update((tasks) => tasks.map((task) => (task.id === id ? updated : task)));
    });
  }

  /** Remove da tela na hora e desfaz se o banco recusar. */
  async remove(id: string): Promise<void> {
    const before = this.tasks();
    this.tasks.set(before.filter((task) => task.id !== id));
    try {
      await this.model.remove(id);
      this.notifier.success('Tarefa excluída.');
    } catch (error) {
      this.tasks.set(before);
      this.fail(error, 'Não foi possível excluir a tarefa.');
    }
  }

  /** Move na tela na hora e desfaz se o banco recusar. */
  async move(id: string, toStatus: TaskStatus, toIndex: number): Promise<void> {
    const before = this.tasks();
    const after = moveTask(before, id, toStatus, toIndex);
    const changes = changedPositions(before, after);
    if (changes.length === 0) {
      return;
    }

    this.tasks.set(after);
    try {
      await this.model.savePositions(changes);
    } catch (error) {
      this.tasks.set(before);
      this.fail(error, 'Não foi possível mover a tarefa.');
    }
  }

  private async save(
    successMessage: string,
    fallback: string,
    action: () => Promise<void>,
  ): Promise<boolean> {
    this.saving.set(true);
    try {
      await action();
      this.notifier.success(successMessage);
      return true;
    } catch (error) {
      this.fail(error, fallback);
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  private fail(error: unknown, fallback: string): void {
    this.notifier.error(errorMessage(error, fallback));
  }
}
