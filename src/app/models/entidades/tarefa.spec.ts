import { ErroValidacao } from './erro-validacao';
import {
  conquistaAoMover,
  DadosTarefa,
  dataHoje,
  diaConcluido,
  entradaNaColuna,
  LIMITES_TAREFA,
  moverTarefa,
  passaNaBusca,
  passaNoFiltro,
  posicoesAlteradas,
  PrioridadeTarefa,
  proximaPosicao,
  situacaoPrazo,
  StatusTarefa,
  Tarefa,
  tarefasPorStatus,
  tempoPorStatus,
  validarDadosTarefa,
} from './tarefa';

const HOJE = '2026-10-02';

function dados(campos: Partial<DadosTarefa>): DadosTarefa {
  return { titulo: 'ok', descricao: '', prioridade: 'medium', prazo: null, ...campos };
}

function tarefa(id: string, status: StatusTarefa, posicao: number): Tarefa {
  return {
    id,
    titulo: id,
    descricao: '',
    status,
    prioridade: 'medium',
    prazo: null,
    posicao,
    criadaEm: '2026-10-02T00:00:00Z',
    historico: [],
  };
}

const posicoesDe = (tarefas: Tarefa[], status: StatusTarefa) =>
  tarefasPorStatus(tarefas, status).map((item) => `${item.id}:${item.posicao}`);

describe('Tarefa (entidade)', () => {
  describe('validarDadosTarefa', () => {
    it('remove espaços do título e da descrição', () => {
      expect(validarDadosTarefa(dados({ titulo: '  Revisar  ', descricao: ' detalhes ' }))).toEqual(
        { titulo: 'Revisar', descricao: 'detalhes', prioridade: 'medium', prazo: null },
      );
    });

    it('recusa título vazio', () => {
      expect(() => validarDadosTarefa(dados({ titulo: '   ' }))).toThrow(ErroValidacao);
    });

    it('recusa título maior que o limite', () => {
      const titulo = 'a'.repeat(LIMITES_TAREFA.tituloMax + 1);
      expect(() => validarDadosTarefa(dados({ titulo }))).toThrow(/no máximo/);
    });

    it('recusa descrição maior que o limite', () => {
      const descricao = 'a'.repeat(LIMITES_TAREFA.descricaoMax + 1);
      expect(() => validarDadosTarefa(dados({ descricao }))).toThrow(ErroValidacao);
    });

    it('recusa prioridade desconhecida', () => {
      const prioridade = 'urgente' as PrioridadeTarefa;
      expect(() => validarDadosTarefa(dados({ prioridade }))).toThrow('Prioridade inválida.');
    });

    it('aceita prazo AAAA-MM-DD e trata vazio como sem prazo', () => {
      expect(validarDadosTarefa(dados({ prazo: '2026-10-05' })).prazo).toBe('2026-10-05');
      expect(validarDadosTarefa(dados({ prazo: '' })).prazo).toBeNull();
    });

    it('recusa prazo em outro formato', () => {
      expect(() => validarDadosTarefa(dados({ prazo: '05/10/2026' }))).toThrow('Prazo inválido.');
    });
  });

  describe('prazo, filtros e busca', () => {
    const comPrazo = (prazo: string, status: StatusTarefa = 'todo'): Tarefa => ({
      ...tarefa('t', status, 0),
      prazo,
    });

    it('dataHoje usa a data local no formato do prazo', () => {
      expect(dataHoje(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    });

    it('classifica o prazo em atrasada, hoje ou futura', () => {
      expect(situacaoPrazo(comPrazo('2026-10-01'), HOJE)).toBe('atrasada');
      expect(situacaoPrazo(comPrazo(HOJE), HOJE)).toBe('hoje');
      expect(situacaoPrazo(comPrazo('2026-10-03'), HOJE)).toBe('futura');
    });

    it('não avisa prazo de tarefa concluída ou sem prazo', () => {
      expect(situacaoPrazo(comPrazo('2026-10-01', 'done'), HOJE)).toBeNull();
      expect(situacaoPrazo(tarefa('t', 'todo', 0), HOJE)).toBeNull();
    });

    it('filtra por hoje, atrasadas e urgente (sem as concluídas)', () => {
      const alta = { ...tarefa('h', 'todo', 0), prioridade: 'high' as const };
      expect(passaNoFiltro(comPrazo(HOJE), 'hoje', HOJE)).toBe(true);
      expect(passaNoFiltro(comPrazo('2026-09-30'), 'atrasadas', HOJE)).toBe(true);
      expect(passaNoFiltro(comPrazo(HOJE), 'atrasadas', HOJE)).toBe(false);
      expect(passaNoFiltro(alta, 'alta', HOJE)).toBe(true);
      expect(passaNoFiltro({ ...alta, status: 'done' }, 'alta', HOJE)).toBe(false);
      expect(passaNoFiltro(tarefa('t', 'done', 0), 'todas', HOJE)).toBe(true);
    });

    it('dia 100% só quando há tarefa para hoje e todas estão concluídas', () => {
      expect(diaConcluido([comPrazo(HOJE, 'done'), comPrazo('2026-10-03')], HOJE)).toBe(true);
      expect(diaConcluido([comPrazo(HOJE, 'done'), comPrazo(HOJE, 'doing')], HOJE)).toBe(false);
      expect(diaConcluido([tarefa('t', 'done', 0)], HOJE)).toBe(false);
      expect(diaConcluido([], HOJE)).toBe(false);
    });

    it('conquista ao mover: tarefa, dia ou nada', () => {
      const pendente = { ...comPrazo(HOJE, 'doing'), id: 'a' };
      const outra = { ...comPrazo(HOJE, 'todo'), id: 'b' };
      const concluir = (lista: Tarefa[], id: string) => moverTarefa(lista, id, 'done', 0);

      expect(conquistaAoMover([pendente, outra], concluir([pendente, outra], 'a'), 'a', HOJE)).toBe(
        'tarefa',
      );
      expect(conquistaAoMover([pendente], concluir([pendente], 'a'), 'a', HOJE)).toBe('dia');

      const pronta = { ...pendente, status: 'done' as const };
      expect(conquistaAoMover([pronta], concluir([pronta], 'a'), 'a', HOJE)).toBeNull();
      expect(
        conquistaAoMover([pendente], moverTarefa([pendente], 'a', 'todo', 0), 'a', HOJE),
      ).toBeNull();
    });

    it('busca no título e na descrição ignorando maiúsculas e acentos', () => {
      const item = { ...tarefa('Reunião', 'todo', 0), descricao: 'Levar o RELATÓRIO' };
      expect(passaNaBusca(item, 'reuniao')).toBe(true);
      expect(passaNaBusca(item, ' relatorio ')).toBe(true);
      expect(passaNaBusca(item, 'orçamento')).toBe(false);
      expect(passaNaBusca(item, '   ')).toBe(true);
    });
  });

  describe('tarefasPorStatus e proximaPosicao', () => {
    const tarefas = [tarefa('b', 'todo', 1), tarefa('x', 'done', 0), tarefa('a', 'todo', 0)];

    it('filtra pela coluna e ordena pela posição', () => {
      expect(tarefasPorStatus(tarefas, 'todo').map((item) => item.id)).toEqual(['a', 'b']);
    });

    it('coloca a nova tarefa no fim da coluna', () => {
      expect(proximaPosicao(tarefas, 'todo')).toBe(2);
      expect(proximaPosicao(tarefas, 'doing')).toBe(0);
    });
  });

  describe('moverTarefa', () => {
    const tarefas = [
      tarefa('a', 'todo', 0),
      tarefa('b', 'todo', 1),
      tarefa('c', 'todo', 2),
      tarefa('d', 'doing', 0),
    ];

    it('reordena dentro da mesma coluna', () => {
      const resultado = moverTarefa(tarefas, 'c', 'todo', 0);
      expect(posicoesDe(resultado, 'todo')).toEqual(['c:0', 'a:1', 'b:2']);
    });

    it('move para outra coluna e renumera as duas', () => {
      const resultado = moverTarefa(tarefas, 'a', 'doing', 1);
      expect(posicoesDe(resultado, 'todo')).toEqual(['b:0', 'c:1']);
      expect(posicoesDe(resultado, 'doing')).toEqual(['d:0', 'a:1']);
    });

    it('limita o índice ao tamanho da coluna', () => {
      const resultado = moverTarefa(tarefas, 'a', 'doing', 99);
      expect(posicoesDe(resultado, 'doing')).toEqual(['d:0', 'a:1']);
    });

    it('não altera a lista original', () => {
      moverTarefa(tarefas, 'a', 'done', 0);
      expect(tarefas[0]).toEqual(tarefa('a', 'todo', 0));
    });

    it('recusa tarefa inexistente', () => {
      expect(() => moverTarefa(tarefas, 'zzz', 'done', 0)).toThrow(ErroValidacao);
    });
  });

  describe('posicoesAlteradas', () => {
    it('retorna só o que mudou', () => {
      const antes = [tarefa('a', 'todo', 0), tarefa('b', 'todo', 1), tarefa('c', 'doing', 0)];
      const depois = moverTarefa(antes, 'b', 'todo', 0);
      expect(posicoesAlteradas(antes, depois)).toEqual([
        { id: 'a', status: 'todo', posicao: 1 },
        { id: 'b', status: 'todo', posicao: 0 },
      ]);
    });

    it('retorna vazio quando nada muda', () => {
      const antes = [tarefa('a', 'todo', 0)];
      expect(posicoesAlteradas(antes, moverTarefa(antes, 'a', 'todo', 0))).toEqual([]);
    });
  });

  describe('tempo em cada coluna', () => {
    const hora = (iso: string) => Date.parse(iso);

    it('registra a entrada na nova coluna ao mover (a partir da criação, se não houver histórico)', () => {
      const [movida] = moverTarefa(
        [tarefa('a', 'todo', 0)],
        'a',
        'doing',
        0,
        '2026-10-02T05:00:00Z',
      );
      expect(movida.historico).toEqual([
        { status: 'todo', desde: '2026-10-02T00:00:00Z' },
        { status: 'doing', desde: '2026-10-02T05:00:00Z' },
      ]);
    });

    it('não registra nada ao reordenar dentro da mesma coluna', () => {
      const tarefas = [tarefa('a', 'todo', 0), tarefa('b', 'todo', 1)];
      const resultado = moverTarefa(tarefas, 'b', 'todo', 0, '2026-10-02T05:00:00Z');
      expect(resultado.every((item) => item.historico.length === 0)).toBe(true);
    });

    it('soma o tempo de cada coluna até agora', () => {
      const comHistorico: Tarefa = {
        ...tarefa('a', 'todo', 0),
        historico: [
          { status: 'todo', desde: '2026-10-02T00:00:00Z' },
          { status: 'doing', desde: '2026-10-02T02:00:00Z' },
          { status: 'todo', desde: '2026-10-02T05:00:00Z' },
        ],
      };
      const tempos = tempoPorStatus(comHistorico, hora('2026-10-02T06:00:00Z'));
      expect(tempos).toEqual({ waiting: 0, todo: 3 * 3_600_000, doing: 3 * 3_600_000, done: 0 });
      expect(entradaNaColuna(comHistorico)).toBe('2026-10-02T05:00:00Z');
    });

    it('aprovar: sair de "Aguardando aprovação" para "A fazer" registra o tempo de espera', () => {
      const aguardando = tarefa('a', 'waiting', 0);
      const [aprovada] = moverTarefa([aguardando], 'a', 'todo', 0, '2026-10-02T04:00:00Z');
      const tempos = tempoPorStatus(aprovada, hora('2026-10-02T05:00:00Z'));
      expect(aprovada.status).toBe('todo');
      expect(tempos.waiting).toBe(4 * 3_600_000);
      expect(tempos.todo).toBe(3_600_000);
    });

    it('sem histórico, conta a coluna atual desde a criação', () => {
      const semHistorico = tarefa('a', 'doing', 0);
      expect(tempoPorStatus(semHistorico, hora('2026-10-02T01:00:00Z')).doing).toBe(3_600_000);
      expect(entradaNaColuna(semHistorico)).toBe('2026-10-02T00:00:00Z');
    });
  });
});
