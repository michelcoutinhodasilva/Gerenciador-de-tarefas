import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { TaskInput } from './entities/task';
import { ValidationError } from './entities/validation-error';
import { TaskModel } from './task.model';

type Result = { data: unknown; error: { message: string } | null };

/** Simula o query builder do Supabase: todo método encadeia e o `await` devolve `result`. */
function fakeSupabase(result: Result) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single']) {
    query[method] = vi.fn(() => query);
  }
  Object.assign(query, {
    then: (onDone: (value: Result) => unknown, onFail: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onDone, onFail),
  });
  const db = { from: vi.fn(() => query) };
  return { db, query };
}

const row = {
  id: '1',
  title: 'Revisar',
  description: 'detalhes',
  status: 'todo',
  priority: 'high',
  due_date: '2026-10-05',
  position: 0,
  created_at: '2026-10-02T00:00:00Z',
};

const empty: TaskInput = { title: '', description: '', priority: 'medium', dueDate: null };

function setup(result: Result) {
  const fake = fakeSupabase(result);
  TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: fake.db }] });
  return { model: TestBed.inject(TaskModel), ...fake };
}

describe('TaskModel', () => {
  it('lista as tarefas convertendo os campos do banco', async () => {
    const { model, db, query } = setup({ data: [row], error: null });

    const tasks = await model.list();

    expect(db.from).toHaveBeenCalledWith('tasks');
    expect(query['order']).toHaveBeenCalledWith('position');
    expect(tasks).toEqual([
      {
        id: '1',
        title: 'Revisar',
        description: 'detalhes',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-10-05',
        position: 0,
        createdAt: '2026-10-02T00:00:00Z',
      },
    ]);
  });

  it('cria a tarefa com os dados já validados', async () => {
    const { model, query } = setup({ data: row, error: null });

    const task = await model.create(
      { title: '  Revisar ', description: 'detalhes', priority: 'high', dueDate: '2026-10-05' },
      'todo',
      3,
    );

    expect(query['insert']).toHaveBeenCalledWith({
      title: 'Revisar',
      description: 'detalhes',
      priority: 'high',
      due_date: '2026-10-05',
      status: 'todo',
      position: 3,
    });
    expect(task.id).toBe('1');
  });

  it('não chama o banco quando o título é inválido', async () => {
    const { model, db } = setup({ data: row, error: null });

    await expect(model.create({ ...empty, title: ' ' }, 'todo', 0)).rejects.toThrow(
      ValidationError,
    );
    expect(db.from).not.toHaveBeenCalled();
  });

  it('atualiza a tarefa pelo id', async () => {
    const { model, query } = setup({ data: row, error: null });

    await model.update('1', { ...empty, title: 'Revisar' });

    expect(query['update']).toHaveBeenCalledWith({
      title: 'Revisar',
      description: '',
      priority: 'medium',
      due_date: null,
    });
    expect(query['eq']).toHaveBeenCalledWith('id', '1');
  });

  it('exclui a tarefa pelo id', async () => {
    const { model, query } = setup({ data: null, error: null });

    await model.remove('1');

    expect(query['delete']).toHaveBeenCalled();
    expect(query['eq']).toHaveBeenCalledWith('id', '1');
  });

  it('salva cada posição alterada', async () => {
    const { model, query } = setup({ data: null, error: null });

    await model.savePositions([
      { id: '1', status: 'doing', position: 0 },
      { id: '2', status: 'todo', position: 1 },
    ]);

    expect(query['update']).toHaveBeenCalledWith({ status: 'doing', position: 0 });
    expect(query['update']).toHaveBeenCalledWith({ status: 'todo', position: 1 });
  });

  it('repassa o erro do banco', async () => {
    const { model } = setup({ data: null, error: { message: 'falha no banco' } });

    await expect(model.list()).rejects.toThrow('falha no banco');
  });
});
