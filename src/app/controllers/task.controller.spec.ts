import { TestBed } from '@angular/core/testing';
import { Notifier } from '../core/notifier';
import { Task, TaskInput, TaskStatus, todayKey } from '../models/entities/task';
import { ValidationError } from '../models/entities/validation-error';
import { TaskModel } from '../models/task.model';
import { TaskController } from './task.controller';

function task(id: string, status: TaskStatus = 'todo', position = 0): Task {
  return {
    id,
    title: id,
    description: '',
    status,
    priority: 'medium',
    dueDate: null,
    position,
    createdAt: '2026-10-02T00:00:00Z',
  };
}

const empty: TaskInput = { title: '', description: '', priority: 'medium', dueDate: null };

function setup(initial: Task[] = []) {
  const model = {
    list: vi.fn().mockResolvedValue(initial),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn().mockResolvedValue(undefined),
    savePositions: vi.fn().mockResolvedValue(undefined),
  };
  const notifier = { success: vi.fn(), error: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      TaskController,
      { provide: TaskModel, useValue: model },
      { provide: Notifier, useValue: notifier },
    ],
  });
  return { controller: TestBed.inject(TaskController), model, notifier };
}

describe('TaskController', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));

  it('carrega as tarefas e monta as colunas', async () => {
    const { controller } = setup([task('a'), task('b', 'done')]);

    await controller.load();

    expect(controller.loading()).toBe(false);
    expect(controller.columns().map((column) => column.tasks.length)).toEqual([1, 0, 1]);
    expect(controller.columns()[0].label).toBe('A fazer');
  });

  it('avisa quando não consegue carregar', async () => {
    const { controller, model, notifier } = setup();
    model.list.mockRejectedValue(new Error('offline'));

    await controller.load();

    expect(notifier.error).toHaveBeenCalledWith('Não foi possível carregar as tarefas.');
  });

  it('cria a tarefa no fim da coluna', async () => {
    const { controller, model, notifier } = setup([task('a', 'todo', 0)]);
    await controller.load();
    model.create.mockResolvedValue(task('b', 'todo', 1));

    const saved = await controller.create({ ...empty, title: 'b' }, 'todo');

    expect(saved).toBe(true);
    expect(model.create).toHaveBeenCalledWith({ ...empty, title: 'b' }, 'todo', 1);
    expect(controller.tasks().map((item) => item.id)).toEqual(['a', 'b']);
    expect(notifier.success).toHaveBeenCalledWith('Tarefa criada.');
  });

  it('mostra a mensagem da regra de negócio quando a criação falha', async () => {
    const { controller, model, notifier } = setup();
    model.create.mockRejectedValue(new ValidationError('O título é obrigatório.'));

    const saved = await controller.create(empty);

    expect(saved).toBe(false);
    expect(notifier.error).toHaveBeenCalledWith('O título é obrigatório.');
    expect(controller.saving()).toBe(false);
  });

  it('atualiza a tarefa na lista', async () => {
    const { controller, model } = setup([task('a')]);
    await controller.load();
    model.update.mockResolvedValue({ ...task('a'), title: 'Novo título' });

    await controller.update('a', { ...empty, title: 'Novo título' });

    expect(controller.tasks()[0].title).toBe('Novo título');
  });

  it('exclui a tarefa', async () => {
    const { controller, model } = setup([task('a'), task('b', 'todo', 1)]);
    await controller.load();

    await controller.remove('a');

    expect(model.remove).toHaveBeenCalledWith('a');
    expect(controller.tasks().map((item) => item.id)).toEqual(['b']);
  });

  it('devolve a tarefa à tela se a exclusão falhar', async () => {
    const { controller, model, notifier } = setup([task('a')]);
    await controller.load();
    model.remove.mockRejectedValue(new Error('offline'));

    await controller.remove('a');

    expect(controller.tasks().map((item) => item.id)).toEqual(['a']);
    expect(notifier.error).toHaveBeenCalledWith('Não foi possível excluir a tarefa.');
  });

  it('move a tarefa e salva só as posições alteradas', async () => {
    const { controller, model } = setup([
      task('a', 'todo', 0),
      task('b', 'todo', 1),
      task('c', 'done', 0),
    ]);
    await controller.load();

    await controller.move('a', 'done', 1);

    expect(controller.columns()[2].tasks.map((item) => item.id)).toEqual(['c', 'a']);
    expect(model.savePositions).toHaveBeenCalledWith([
      { id: 'a', status: 'done', position: 1 },
      { id: 'b', status: 'todo', position: 0 },
    ]);
  });

  it('não chama o banco quando a tarefa volta para o mesmo lugar', async () => {
    const { controller, model } = setup([task('a')]);
    await controller.load();

    await controller.move('a', 'todo', 0);

    expect(model.savePositions).not.toHaveBeenCalled();
  });

  it('desfaz o movimento se o banco recusar', async () => {
    const { controller, model } = setup([task('a', 'todo', 0)]);
    await controller.load();
    model.savePositions.mockRejectedValue(new Error('offline'));

    await controller.move('a', 'doing', 0);

    expect(controller.tasks()[0].status).toBe('todo');
  });

  it('conclui a tarefa mandando para o fim de "Concluído"', async () => {
    const { controller, model, notifier } = setup([task('a', 'todo', 0), task('c', 'done', 0)]);
    await controller.load();

    await controller.complete('a');

    expect(controller.columns()[2].tasks.map((item) => item.id)).toEqual(['c', 'a']);
    expect(model.savePositions).toHaveBeenCalledWith([{ id: 'a', status: 'done', position: 1 }]);
    expect(notifier.success).toHaveBeenCalledWith('Tarefa concluída.');
  });

  it('não avisa sucesso se não conseguir concluir', async () => {
    const { controller, model, notifier } = setup([task('a')]);
    await controller.load();
    model.savePositions.mockRejectedValue(new Error('offline'));

    await controller.complete('a');

    expect(notifier.success).not.toHaveBeenCalled();
    expect(controller.tasks()[0].status).toBe('todo');
  });

  describe('busca, filtros e resumo', () => {
    const overdue = { ...task('Atrasada'), dueDate: '2000-01-01' };
    const forToday = { ...task('Hoje', 'doing'), dueDate: todayKey(), priority: 'high' as const };
    const finished = { ...task('Pronta', 'done'), dueDate: '2000-01-01' };

    async function loaded() {
      const ctx = setup([overdue, forToday, finished]);
      await ctx.controller.load();
      return ctx.controller;
    }

    const visible = (controller: TaskController) =>
      controller.columns().flatMap((column) => column.tasks.map((item) => item.id));

    it('conta as tarefas de cada filtro rápido', async () => {
      const controller = await loaded();

      expect(controller.filterCounts()).toEqual({ all: 3, today: 1, overdue: 1, high: 1 });
      expect(controller.progress()).toEqual({ done: 1, total: 3, percent: 33 });
    });

    it('mostra só as tarefas do filtro e da busca escolhidos', async () => {
      const controller = await loaded();

      controller.filter.set('overdue');
      expect(visible(controller)).toEqual(['Atrasada']);
      expect(controller.filtering()).toBe(true);

      controller.filter.set('all');
      controller.search.set('pron');
      expect(visible(controller)).toEqual(['Pronta']);
    });

    it('limpa busca e filtro de uma vez', async () => {
      const controller = await loaded();
      controller.filter.set('high');
      controller.search.set('x');

      controller.clearFilters();

      expect(controller.filtering()).toBe(false);
      expect(visible(controller)).toHaveLength(3);
    });
  });
});
