import {
  changedPositions,
  dueState,
  matchesFilter,
  matchesSearch,
  moveTask,
  nextPosition,
  Task,
  TASK_LIMITS,
  TaskInput,
  TaskPriority,
  TaskStatus,
  tasksByStatus,
  todayKey,
  validateTaskInput,
} from './task';
import { ValidationError } from './validation-error';

const TODAY = '2026-10-02';

function input(fields: Partial<TaskInput>): TaskInput {
  return { title: 'ok', description: '', priority: 'medium', dueDate: null, ...fields };
}

function task(id: string, status: TaskStatus, position: number): Task {
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

const positionsOf = (tasks: Task[], status: TaskStatus) =>
  tasksByStatus(tasks, status).map((item) => `${item.id}:${item.position}`);

describe('Task (entidade)', () => {
  describe('validateTaskInput', () => {
    it('remove espaços do título e da descrição', () => {
      expect(validateTaskInput(input({ title: '  Revisar  ', description: ' detalhes ' }))).toEqual(
        { title: 'Revisar', description: 'detalhes', priority: 'medium', dueDate: null },
      );
    });

    it('recusa título vazio', () => {
      expect(() => validateTaskInput(input({ title: '   ' }))).toThrow(ValidationError);
    });

    it('recusa título maior que o limite', () => {
      const title = 'a'.repeat(TASK_LIMITS.titleMax + 1);
      expect(() => validateTaskInput(input({ title }))).toThrow(/no máximo/);
    });

    it('recusa descrição maior que o limite', () => {
      const description = 'a'.repeat(TASK_LIMITS.descriptionMax + 1);
      expect(() => validateTaskInput(input({ description }))).toThrow(ValidationError);
    });

    it('recusa prioridade desconhecida', () => {
      const priority = 'urgente' as TaskPriority;
      expect(() => validateTaskInput(input({ priority }))).toThrow('Prioridade inválida.');
    });

    it('aceita prazo AAAA-MM-DD e trata vazio como sem prazo', () => {
      expect(validateTaskInput(input({ dueDate: '2026-10-05' })).dueDate).toBe('2026-10-05');
      expect(validateTaskInput(input({ dueDate: '' })).dueDate).toBeNull();
    });

    it('recusa prazo em outro formato', () => {
      expect(() => validateTaskInput(input({ dueDate: '05/10/2026' }))).toThrow('Prazo inválido.');
    });
  });

  describe('prazo, filtros e busca', () => {
    const withDue = (dueDate: string, status: TaskStatus = 'todo'): Task => ({
      ...task('t', status, 0),
      dueDate,
    });

    it('todayKey usa a data local no formato do prazo', () => {
      expect(todayKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    });

    it('classifica o prazo em atrasada, hoje ou futura', () => {
      expect(dueState(withDue('2026-10-01'), TODAY)).toBe('overdue');
      expect(dueState(withDue(TODAY), TODAY)).toBe('today');
      expect(dueState(withDue('2026-10-03'), TODAY)).toBe('upcoming');
    });

    it('não avisa prazo de tarefa concluída ou sem prazo', () => {
      expect(dueState(withDue('2026-10-01', 'done'), TODAY)).toBeNull();
      expect(dueState(task('t', 'todo', 0), TODAY)).toBeNull();
    });

    it('filtra por hoje, atrasadas e alta prioridade (sem as concluídas)', () => {
      const high = { ...task('h', 'todo', 0), priority: 'high' as const };
      expect(matchesFilter(withDue(TODAY), 'today', TODAY)).toBe(true);
      expect(matchesFilter(withDue('2026-09-30'), 'overdue', TODAY)).toBe(true);
      expect(matchesFilter(withDue(TODAY), 'overdue', TODAY)).toBe(false);
      expect(matchesFilter(high, 'high', TODAY)).toBe(true);
      expect(matchesFilter({ ...high, status: 'done' }, 'high', TODAY)).toBe(false);
      expect(matchesFilter(task('t', 'done', 0), 'all', TODAY)).toBe(true);
    });

    it('busca no título e na descrição ignorando maiúsculas e acentos', () => {
      const item = { ...task('Reunião', 'todo', 0), description: 'Levar o RELATÓRIO' };
      expect(matchesSearch(item, 'reuniao')).toBe(true);
      expect(matchesSearch(item, ' relatorio ')).toBe(true);
      expect(matchesSearch(item, 'orçamento')).toBe(false);
      expect(matchesSearch(item, '   ')).toBe(true);
    });
  });

  describe('tasksByStatus e nextPosition', () => {
    const tasks = [task('b', 'todo', 1), task('x', 'done', 0), task('a', 'todo', 0)];

    it('filtra pela coluna e ordena pela posição', () => {
      expect(tasksByStatus(tasks, 'todo').map((item) => item.id)).toEqual(['a', 'b']);
    });

    it('coloca a nova tarefa no fim da coluna', () => {
      expect(nextPosition(tasks, 'todo')).toBe(2);
      expect(nextPosition(tasks, 'doing')).toBe(0);
    });
  });

  describe('moveTask', () => {
    const tasks = [
      task('a', 'todo', 0),
      task('b', 'todo', 1),
      task('c', 'todo', 2),
      task('d', 'doing', 0),
    ];

    it('reordena dentro da mesma coluna', () => {
      const result = moveTask(tasks, 'c', 'todo', 0);
      expect(positionsOf(result, 'todo')).toEqual(['c:0', 'a:1', 'b:2']);
    });

    it('move para outra coluna e renumera as duas', () => {
      const result = moveTask(tasks, 'a', 'doing', 1);
      expect(positionsOf(result, 'todo')).toEqual(['b:0', 'c:1']);
      expect(positionsOf(result, 'doing')).toEqual(['d:0', 'a:1']);
    });

    it('limita o índice ao tamanho da coluna', () => {
      const result = moveTask(tasks, 'a', 'doing', 99);
      expect(positionsOf(result, 'doing')).toEqual(['d:0', 'a:1']);
    });

    it('não altera a lista original', () => {
      moveTask(tasks, 'a', 'done', 0);
      expect(tasks[0]).toEqual(task('a', 'todo', 0));
    });

    it('recusa tarefa inexistente', () => {
      expect(() => moveTask(tasks, 'zzz', 'done', 0)).toThrow(ValidationError);
    });
  });

  describe('changedPositions', () => {
    it('retorna só o que mudou', () => {
      const before = [task('a', 'todo', 0), task('b', 'todo', 1), task('c', 'doing', 0)];
      const after = moveTask(before, 'b', 'todo', 0);
      expect(changedPositions(before, after)).toEqual([
        { id: 'a', status: 'todo', position: 1 },
        { id: 'b', status: 'todo', position: 0 },
      ]);
    });

    it('retorna vazio quando nada muda', () => {
      const before = [task('a', 'todo', 0)];
      expect(changedPositions(before, moveTask(before, 'a', 'todo', 0))).toEqual([]);
    });
  });
});
