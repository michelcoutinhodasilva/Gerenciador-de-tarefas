import {
  changedPositions,
  moveTask,
  nextPosition,
  Task,
  TASK_LIMITS,
  TaskStatus,
  tasksByStatus,
  validateTaskInput,
} from './task';
import { ValidationError } from './validation-error';

function task(id: string, status: TaskStatus, position: number): Task {
  return { id, title: id, description: '', status, position, createdAt: '2026-10-02T00:00:00Z' };
}

const positionsOf = (tasks: Task[], status: TaskStatus) =>
  tasksByStatus(tasks, status).map((item) => `${item.id}:${item.position}`);

describe('Task (entidade)', () => {
  describe('validateTaskInput', () => {
    it('remove espaços do título e da descrição', () => {
      expect(validateTaskInput({ title: '  Revisar  ', description: ' detalhes ' })).toEqual({
        title: 'Revisar',
        description: 'detalhes',
      });
    });

    it('recusa título vazio', () => {
      expect(() => validateTaskInput({ title: '   ', description: '' })).toThrow(ValidationError);
    });

    it('recusa título maior que o limite', () => {
      const title = 'a'.repeat(TASK_LIMITS.titleMax + 1);
      expect(() => validateTaskInput({ title, description: '' })).toThrow(/no máximo/);
    });

    it('recusa descrição maior que o limite', () => {
      const description = 'a'.repeat(TASK_LIMITS.descriptionMax + 1);
      expect(() => validateTaskInput({ title: 'ok', description })).toThrow(ValidationError);
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
