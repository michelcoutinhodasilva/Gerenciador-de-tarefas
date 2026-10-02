import { TestBed } from '@angular/core/testing';
import { Task } from '../../../models/entities/task';
import { KanbanColumnView } from './kanban-column.view';

const tasks: Task[] = [
  {
    id: '1',
    title: 'Primeira',
    description: '',
    status: 'doing',
    position: 0,
    createdAt: '2026-10-02',
  },
  {
    id: '2',
    title: 'Segunda',
    description: '',
    status: 'doing',
    position: 1,
    createdAt: '2026-10-02',
  },
];

async function setup(items: Task[]) {
  const fixture = TestBed.createComponent(KanbanColumnView);
  fixture.componentRef.setInput('status', 'doing');
  fixture.componentRef.setInput('label', 'Em andamento');
  fixture.componentRef.setInput('tasks', items);
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('KanbanColumnView', () => {
  it('mostra o nome, o total e os cartões', async () => {
    const { element } = await setup(tasks);

    expect(element.querySelector('h2')?.textContent).toContain('Em andamento');
    expect(element.querySelector('[data-testid="count"]')?.textContent).toBe('2');
    expect(element.querySelectorAll('app-task-card').length).toBe(2);
  });

  it('mostra aviso quando a coluna está vazia', async () => {
    const { element } = await setup([]);

    expect(element.textContent).toContain('Arraste uma tarefa para cá');
  });

  it('repassa o pedido de excluir com a tarefa certa', async () => {
    const { fixture, element } = await setup(tasks);
    const remove = vi.fn();
    fixture.componentInstance.remove.subscribe(remove);

    element.querySelectorAll<HTMLButtonElement>('[data-testid="remove"]')[1].click();

    expect(remove).toHaveBeenCalledWith(tasks[1]);
  });

  it('avisa quando clicam em adicionar', async () => {
    const { fixture, element } = await setup(tasks);
    const add = vi.fn();
    fixture.componentInstance.add.subscribe(add);

    element.querySelector<HTMLButtonElement>('[data-testid="add"]')!.click();

    expect(add).toHaveBeenCalledOnce();
  });
});
