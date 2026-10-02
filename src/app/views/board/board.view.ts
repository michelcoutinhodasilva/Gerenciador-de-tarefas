import { CdkDragDrop, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { AuthController } from '../../controllers/auth.controller';
import { TaskController } from '../../controllers/task.controller';
import { Task, TaskInput, TaskStatus } from '../../models/entities/task';
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

  /** Atalho estilo Linear: tecla "C" cria uma tarefa. */
  protected onShortcut(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing = target?.closest('input, textarea, [contenteditable="true"]');
    if (
      event.key.toLowerCase() !== 'c' ||
      typing ||
      this.dialogOpen() ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }
    event.preventDefault();
    this.openCreate();
  }
}
