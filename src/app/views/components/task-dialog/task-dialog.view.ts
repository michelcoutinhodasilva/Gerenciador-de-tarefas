import { Component, effect, inject, input, model, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { SelectButton } from 'primeng/selectbutton';
import { Textarea } from 'primeng/textarea';
import {
  Task,
  TASK_LIMITS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TaskInput,
  TaskPriority,
  todayKey,
} from '../../../models/entities/task';

/** View: janela para criar ou editar uma tarefa. Entrega os dados digitados em `save`. */
@Component({
  selector: 'app-task-dialog',
  imports: [ReactiveFormsModule, Dialog, Button, InputText, SelectButton, Textarea],
  templateUrl: './task-dialog.view.html',
})
export class TaskDialogView {
  readonly visible = model(false);
  readonly task = input<Task | null>(null);
  readonly saving = input(false);
  readonly save = output<TaskInput>();

  protected readonly limits = TASK_LIMITS;
  protected readonly priorities = TASK_PRIORITIES.map((value) => ({
    value,
    label: TASK_PRIORITY_LABELS[value],
  }));
  protected readonly form = inject(NonNullableFormBuilder).group({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    dueDate: '',
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        const task = this.task();
        this.form.reset({
          title: task?.title ?? '',
          description: task?.description ?? '',
          priority: task?.priority ?? 'medium',
          dueDate: task?.dueDate ?? '',
        });
      }
    });
  }

  /** Atalho para o prazo: 0 = hoje, 1 = amanhã. */
  protected setDue(daysFromToday: number): void {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    this.form.controls.dueDate.setValue(todayKey(date));
  }

  protected submit(): void {
    const value = this.form.getRawValue();
    this.save.emit({ ...value, dueDate: value.dueDate || null });
  }
}
