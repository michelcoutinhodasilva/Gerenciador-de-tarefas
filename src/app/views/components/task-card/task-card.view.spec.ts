import { TestBed } from '@angular/core/testing';
import { Task } from '../../../models/entities/task';
import { TaskCardView } from './task-card.view';

const task: Task = {
  id: '1',
  title: 'Revisar proposta',
  description: 'Enviar até sexta',
  status: 'todo',
  priority: 'high',
  dueDate: null,
  position: 0,
  createdAt: '2026-10-02T12:00:00Z',
};

async function setup(fields: Partial<Task> = {}) {
  const fixture = TestBed.createComponent(TaskCardView);
  fixture.componentRef.setInput('task', { ...task, ...fields });
  fixture.componentRef.setInput('today', '2026-10-02');
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const text = (testId: string) =>
    element.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();
  return { fixture, element, text };
}

describe('TaskCardView', () => {
  it('mostra título, descrição, prioridade e data', async () => {
    const { element, text } = await setup();

    expect(element.textContent).toContain('Revisar proposta');
    expect(element.textContent).toContain('Enviar até sexta');
    expect(element.textContent).toContain('02/10/2026');
    expect(text('priority')).toBe('Alta');
    expect(text('due')).toBeUndefined();
  });

  it('avisa prazo atrasado e prazo de hoje', async () => {
    expect((await setup({ dueDate: '2026-09-30' })).text('due')).toBe('Atrasada · 30/09');
    expect((await setup({ dueDate: '2026-10-02' })).text('due')).toBe('Hoje · 02/10');
    expect((await setup({ dueDate: '2026-10-09' })).text('due')).toBe('09/10');
  });

  it('avisa quando clicam em concluir, editar e excluir', async () => {
    const { fixture, element } = await setup();
    const complete = vi.fn();
    const edit = vi.fn();
    const remove = vi.fn();
    fixture.componentInstance.complete.subscribe(complete);
    fixture.componentInstance.edit.subscribe(edit);
    fixture.componentInstance.remove.subscribe(remove);

    element.querySelector<HTMLButtonElement>('[data-testid="complete"]')!.click();
    element.querySelector<HTMLButtonElement>('[data-testid="edit"]')!.click();
    element.querySelector<HTMLButtonElement>('[data-testid="remove"]')!.click();

    expect(complete).toHaveBeenCalledOnce();
    expect(edit).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
  });

  it('esconde o botão concluir em tarefa já concluída', async () => {
    const { element } = await setup({ status: 'done' });

    expect(element.querySelector('[data-testid="complete"]')).toBeNull();
  });
});
