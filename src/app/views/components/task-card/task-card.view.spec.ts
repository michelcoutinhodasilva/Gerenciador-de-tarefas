import { TestBed } from '@angular/core/testing';
import { Task } from '../../../models/entities/task';
import { TaskCardView } from './task-card.view';

const task: Task = {
  id: '1',
  title: 'Revisar proposta',
  description: 'Enviar até sexta',
  status: 'todo',
  position: 0,
  createdAt: '2026-10-02T12:00:00Z',
};

async function setup() {
  const fixture = TestBed.createComponent(TaskCardView);
  fixture.componentRef.setInput('task', task);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element };
}

describe('TaskCardView', () => {
  it('mostra título, descrição e data', async () => {
    const { element } = await setup();

    expect(element.textContent).toContain('Revisar proposta');
    expect(element.textContent).toContain('Enviar até sexta');
    expect(element.textContent).toContain('02/10/2026');
  });

  it('avisa quando clicam em editar e excluir', async () => {
    const { fixture, element } = await setup();
    const edit = vi.fn();
    const remove = vi.fn();
    fixture.componentInstance.edit.subscribe(edit);
    fixture.componentInstance.remove.subscribe(remove);

    element.querySelector<HTMLButtonElement>('[data-testid="edit"]')!.click();
    element.querySelector<HTMLButtonElement>('[data-testid="remove"]')!.click();

    expect(edit).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
  });
});
