import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, computed, input, output } from '@angular/core';
import { Task, TaskStatus } from '../../../models/entities/task';
import { TaskCardView } from '../task-card/task-card.view';

const STATUS_COLORS: Readonly<Record<TaskStatus, string>> = {
  todo: 'column-status-dot--todo',
  doing: 'column-status-dot--doing',
  done: 'column-status-dot--done',
};

/** View: uma coluna do Kanban. Repassa as ações para a tela do quadro. */
@Component({
  selector: 'app-kanban-column',
  imports: [CdkDropList, CdkDrag, TaskCardView],
  templateUrl: './kanban-column.view.html',
  host: { class: 'flex' },
})
export class KanbanColumnView {
  readonly status = input.required<TaskStatus>();
  readonly label = input.required<string>();
  readonly tasks = input.required<Task[]>();
  readonly today = input.required<string>();
  /** Com busca/filtro a coluna está incompleta, então arrastar salvaria a posição errada. */
  readonly filtering = input(false);

  readonly add = output<void>();
  readonly edit = output<Task>();
  readonly remove = output<Task>();
  readonly complete = output<Task>();
  readonly dropped = output<CdkDragDrop<TaskStatus, TaskStatus, Task>>();

  protected readonly dotColor = computed(() => STATUS_COLORS[this.status()]);
}
