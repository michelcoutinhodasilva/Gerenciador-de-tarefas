import { Component, effect, inject, input, model, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Task, TASK_LIMITS, TaskInput } from '../../../models/entities/task';

/** View: janela para criar ou editar uma tarefa. Entrega os dados digitados em `save`. */
@Component({
  selector: 'app-task-dialog',
  imports: [ReactiveFormsModule, Dialog, Button, InputText, Textarea],
  templateUrl: './task-dialog.view.html',
})
export class TaskDialogView {
  readonly visible = model(false);
  readonly task = input<Task | null>(null);
  readonly saving = input(false);
  readonly save = output<TaskInput>();

  protected readonly limits = TASK_LIMITS;
  protected readonly form = inject(NonNullableFormBuilder).group({
    title: '',
    description: '',
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        const task = this.task();
        this.form.reset({ title: task?.title ?? '', description: task?.description ?? '' });
      }
    });
  }

  protected submit(): void {
    this.save.emit(this.form.getRawValue());
  }
}
