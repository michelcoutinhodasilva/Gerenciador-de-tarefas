import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import {
  DueState,
  dueState,
  Task,
  TASK_PRIORITY_LABELS,
  TaskPriority,
} from '../../../models/entities/task';

const PRIORITY_STYLES: Readonly<Record<TaskPriority, string>> = {
  low: 'task-priority--low',
  medium: 'task-priority--medium',
  high: 'task-priority--high',
};

const DUE_STYLES: Readonly<Record<DueState | 'none', string>> = {
  overdue: 'task-due--overdue',
  today: 'task-due--today',
  upcoming: 'task-due--upcoming',
  none: 'task-due--none',
};

const DUE_PREFIX: Readonly<Partial<Record<DueState, string>>> = {
  overdue: 'Atrasada · ',
  today: 'Hoje · ',
};

/** View: cartão de uma tarefa. Só mostra e avisa os cliques. */
@Component({
  selector: 'app-task-card',
  imports: [DatePipe],
  templateUrl: './task-card.view.html',
  host: { class: 'block' },
})
export class TaskCardView {
  readonly task = input.required<Task>();
  /** Data de hoje (AAAA-MM-DD) usada para avisar prazos. */
  readonly today = input.required<string>();
  readonly edit = output<void>();
  readonly remove = output<void>();
  readonly complete = output<void>();

  protected readonly priorityLabel = computed(() => TASK_PRIORITY_LABELS[this.task().priority]);
  protected readonly priorityStyle = computed(() => PRIORITY_STYLES[this.task().priority]);

  private readonly due = computed(() => dueState(this.task(), this.today()));
  protected readonly dueStyle = computed(() => DUE_STYLES[this.due() ?? 'none']);
  protected readonly duePrefix = computed(() => DUE_PREFIX[this.due() ?? 'upcoming'] ?? '');
  protected readonly overdue = computed(() => this.due() === 'overdue');
}
