import { diaEntrega, gradeDoMes, mudarMes, tarefasDoDia } from './calendario';
import { PassagemColuna, StatusTarefa, Tarefa } from './tarefa';

/** Datas sem "Z" são lidas no fuso local, como as do navegador do usuário. */
function tarefa(
  id: string,
  criadaEm: string,
  status: StatusTarefa = 'todo',
  historico: PassagemColuna[] = [],
): Tarefa {
  return {
    id,
    titulo: id,
    descricao: '',
    status,
    prioridade: 'medium',
    prazo: null,
    posicao: 0,
    criadaEm,
    historico,
  };
}

const entregue = (id: string, criadaEm: string, entregueEm: string) =>
  tarefa(id, criadaEm, 'done', [
    { status: 'todo', desde: criadaEm },
    { status: 'done', desde: entregueEm },
  ]);

describe('Calendário (entidade)', () => {
  describe('diaEntrega', () => {
    it('é o dia em que a tarefa entrou em "Concluído"', () => {
      expect(diaEntrega(entregue('a', '2026-10-01T09:00:00', '2026-10-03T18:00:00'))).toBe(
        '2026-10-03',
      );
    });

    it('é null para tarefa não concluída', () => {
      expect(diaEntrega(tarefa('a', '2026-10-01T09:00:00', 'doing'))).toBeNull();
    });

    it('conta a última entrega quando a tarefa saiu e voltou para "Concluído"', () => {
      const t = tarefa('a', '2026-10-01T09:00:00', 'done', [
        { status: 'done', desde: '2026-10-02T09:00:00' },
        { status: 'doing', desde: '2026-10-03T09:00:00' },
        { status: 'done', desde: '2026-10-05T09:00:00' },
      ]);
      expect(diaEntrega(t)).toBe('2026-10-05');
    });

    it('sem histórico, usa a data de criação', () => {
      expect(diaEntrega(tarefa('a', '2026-10-01T09:00:00', 'done'))).toBe('2026-10-01');
    });
  });

  describe('mudarMes', () => {
    it('avança e volta virando o ano', () => {
      expect(mudarMes('2026-12', 1)).toBe('2027-01');
      expect(mudarMes('2026-01', -1)).toBe('2025-12');
    });
  });

  describe('gradeDoMes', () => {
    it('cobre semanas completas de domingo a sábado', () => {
      // Outubro/2026 começa numa quinta e termina num sábado.
      const grade = gradeDoMes('2026-10', []);

      expect(grade).toHaveLength(35);
      expect(grade[0]).toMatchObject({ data: '2026-09-27', doMes: false });
      expect(grade[4]).toMatchObject({ data: '2026-10-01', numero: 1, doMes: true });
      expect(grade.at(-1)).toMatchObject({ data: '2026-10-31', doMes: true });
    });

    it('conta criadas e entregues em cada dia', () => {
      const grade = gradeDoMes('2026-10', [
        tarefa('a', '2026-10-05T08:00:00'),
        entregue('b', '2026-10-05T10:00:00', '2026-10-07T11:00:00'),
      ]);
      const dia = (data: string) => grade.find((item) => item.data === data);

      expect(dia('2026-10-05')).toMatchObject({ criadas: 2, entregues: 0 });
      expect(dia('2026-10-07')).toMatchObject({ criadas: 0, entregues: 1 });
    });
  });

  describe('tarefasDoDia', () => {
    it('separa as criadas e as entregues no dia, em ordem de horário', () => {
      const tarefas = [
        tarefa('tarde', '2026-10-05T15:00:00'),
        tarefa('manha', '2026-10-05T08:00:00'),
        entregue('feita', '2026-10-01T08:00:00', '2026-10-05T12:00:00'),
        tarefa('outro-dia', '2026-10-06T08:00:00'),
      ];

      const doDia = tarefasDoDia(tarefas, '2026-10-05');

      expect(doDia.criadas.map((t) => t.id)).toEqual(['manha', 'tarde']);
      expect(doDia.entregues.map((t) => t.id)).toEqual(['feita']);
    });
  });
});
