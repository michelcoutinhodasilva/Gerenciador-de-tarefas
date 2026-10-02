import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { Task } from '../../../models/entities/task';

/** View: cartão de uma tarefa. Só mostra e avisa os cliques. */
@Component({
  selector: 'app-task-card',
  imports: [DatePipe],
  templateUrl: './task-card.view.html',
  host: { class: 'block' },
})
export class TaskCardView {
  readonly task = input.required<Task>();
  readonly edit = output<void>();
  readonly remove = output<void>();
}
