import { CdkDragDrop, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { AuthController } from '../../controllers/auth.controller';
import { TaskController } from '../../controllers/task.controller';
import {
  Task,
  TASK_FILTER_LABELS,
  TASK_FILTERS,
  TaskInput,
  TaskStatus,
} from '../../models/entities/task';
import { KanbanColumnView } from '../components/kanban-column/kanban-column.view';
import { TaskDialogView } from '../components/task-dialog/task-dialog.view';

/** View: tela do quadro Kanban. Toda ação é repassada aos controllers. */
@Component({
  selector: 'app-board-view',
  imports: [CdkDropListGroup, Button, KanbanColumnView, TaskDialogView],
  providers: [TaskController],
  templateUrl: './board.view.html',
  host: { '(document:keydown)': 'onShortcut($event)' },
})
export class BoardView implements OnInit {
  protected readonly tasks = inject(TaskController);
  protected readonly auth = inject(AuthController);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Task | null>(null);
  private readonly newTaskStatus = signal<TaskStatus>('todo');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly filters = TASK_FILTERS.map((value) => ({
    value,
    label: TASK_FILTER_LABELS[value],
  }));

  protected readonly summary = computed(() => {
    const counts: Record<TaskStatus, number> = { todo: 0, doing: 0, done: 0 };
    for (const task of this.tasks.tasks()) {
      counts[task.status] += 1;
    }
    return counts;
  });

  protected readonly dateLabel = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  ngOnInit(): void {
    this.tasks.load();
  }

  protected openCreate(status: TaskStatus = 'todo'): void {
    this.editing.set(null);
    this.newTaskStatus.set(status);
    this.dialogOpen.set(true);
  }

  protected openEdit(task: Task): void {
    this.editing.set(task);
    this.dialogOpen.set(true);
  }

  protected async save(input: TaskInput): Promise<void> {
    const task = this.editing();
    const saved = task
      ? await this.tasks.update(task.id, input)
      : await this.tasks.create(input, this.newTaskStatus());
    if (saved) {
      this.dialogOpen.set(false);
    }
  }

  protected confirmRemove(task: Task): void {
    this.confirmation.confirm({
      header: 'Excluir tarefa',
      message: `Excluir "${task.title}"? Essa ação não pode ser desfeita.`,
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: () => this.tasks.remove(task.id),
    });
  }

  protected drop(event: CdkDragDrop<TaskStatus, TaskStatus, Task>): void {
    this.tasks.move(event.item.data.id, event.container.data, event.currentIndex);
  }

  /** Atalhos estilo Linear: "C" cria uma tarefa e "/" vai para a busca. */
  protected onShortcut(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing = target?.closest('input, textarea, [contenteditable="true"]');
    if (typing || this.dialogOpen() || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === 'c') {
      event.preventDefault();
      this.openCreate();
    } else if (key === '/') {
      event.preventDefault();
      this.searchInput()?.nativeElement.focus();
    }
  }

  /** Esc na busca limpa o texto e tira o foco. */
  protected clearSearch(input: HTMLInputElement): void {
    this.tasks.search.set('');
    input.blur();
  }
}
