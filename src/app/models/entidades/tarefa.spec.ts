import { ErroValidacao } from './erro-validacao';
import {
  DadosTarefa,
  dataHoje,
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

    it('filtra por hoje, atrasadas e alta prioridade (sem as concluídas)', () => {
      const alta = { ...tarefa('h', 'todo', 0), prioridade: 'high' as const };
      expect(passaNoFiltro(comPrazo(HOJE), 'hoje', HOJE)).toBe(true);
      expect(passaNoFiltro(comPrazo('2026-09-30'), 'atrasadas', HOJE)).toBe(true);
      expect(passaNoFiltro(comPrazo(HOJE), 'atrasadas', HOJE)).toBe(false);
      expect(passaNoFiltro(alta, 'alta', HOJE)).toBe(true);
      expect(passaNoFiltro({ ...alta, status: 'done' }, 'alta', HOJE)).toBe(false);
      expect(passaNoFiltro(tarefa('t', 'done', 0), 'todas', HOJE)).toBe(true);
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
});
