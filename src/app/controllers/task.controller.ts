import { computed, inject, Injectable, signal } from '@angular/core';
import { Notifier } from '../core/notifier';
import {
  changedPositions,
  matchesFilter,
  matchesSearch,
  moveTask,
  nextPosition,
  Task,
  TASK_FILTERS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  TaskFilter,
  TaskInput,
  TaskStatus,
  tasksByStatus,
  todayKey,
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
  readonly search = signal('');
  readonly filter = signal<TaskFilter>('all');
  /** Data de referência para prazos; renovada a cada carregamento. */
  readonly today = signal(todayKey());

  /** Com busca ou filtro ativo, a coluna mostra só parte das tarefas. */
  readonly filtering = computed(() => this.search().trim() !== '' || this.filter() !== 'all');

  private readonly visibleTasks = computed(() =>
    this.tasks().filter(
      (task) =>
        matchesSearch(task, this.search()) && matchesFilter(task, this.filter(), this.today()),
    ),
  );

  readonly columns = computed<BoardColumn[]>(() =>
    TASK_STATUSES.map((status) => ({
      status,
      label: TASK_STATUS_LABELS[status],
      tasks: tasksByStatus(this.visibleTasks(), status),
    })),
  );

  /** Quantas tarefas cabem em cada filtro rápido (ignora a busca). */
  readonly filterCounts = computed(
    () =>
      Object.fromEntries(
        TASK_FILTERS.map((filter) => [
          filter,
          this.tasks().filter((task) => matchesFilter(task, filter, this.today())).length,
        ]),
      ) as Record<TaskFilter, number>,
  );

  readonly progress = computed(() => {
    const total = this.tasks().length;
    const done = this.tasks().filter((task) => task.status === 'done').length;
    return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
  });

  clearFilters(): void {
    this.search.set('');
    this.filter.set('all');
  }

  async load(): Promise<void> {
    this.today.set(todayKey());
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

  /** Move na tela na hora e desfaz se o banco recusar. Devolve `true` se ficou salvo. */
  async move(id: string, toStatus: TaskStatus, toIndex: number): Promise<boolean> {
    const before = this.tasks();
    const after = moveTask(before, id, toStatus, toIndex);
    const changes = changedPositions(before, after);
    if (changes.length === 0) {
      return true;
    }

    this.tasks.set(after);
    try {
      await this.model.savePositions(changes);
      return true;
    } catch (error) {
      this.tasks.set(before);
      this.fail(error, 'Não foi possível mover a tarefa.');
      return false;
    }
  }

  /** Atalho: manda a tarefa para o fim de "Concluído". */
  async complete(id: string): Promise<void> {
    const end = tasksByStatus(this.tasks(), 'done').length;
    if (await this.move(id, 'done', end)) {
      this.notifier.success('Tarefa concluída.');
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
