import { ErroValidacao } from './erro-validacao';

/** Códigos iguais aos gravados no banco (supabase/schema.sql). */
export type StatusTarefa = 'todo' | 'doing' | 'done';

/** Ordem das colunas do quadro (fonte única dos status). */
export const STATUS_TAREFA: readonly StatusTarefa[] = ['todo', 'doing', 'done'];

export const ROTULOS_STATUS: Readonly<Record<StatusTarefa, string>> = {
  todo: 'A fazer',
  doing: 'Em andamento',
  done: 'Concluído',
};

/** Códigos iguais aos gravados no banco (supabase/schema.sql). */
export type PrioridadeTarefa = 'low' | 'medium' | 'high';

export const PRIORIDADES_TAREFA: readonly PrioridadeTarefa[] = ['low', 'medium', 'high'];

export const ROTULOS_PRIORIDADE: Readonly<Record<PrioridadeTarefa, string>> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

/** Mantenha igual às regras de supabase/schema.sql. */
export const LIMITES_TAREFA = { tituloMax: 120, descricaoMax: 2000 } as const;

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  status: StatusTarefa;
  prioridade: PrioridadeTarefa;
  /** Prazo no formato AAAA-MM-DD, ou `null` sem prazo. */
  prazo: string | null;
  posicao: number;
  criadaEm: string;
}

export interface DadosTarefa {
  titulo: string;
  descricao: string;
  prioridade: PrioridadeTarefa;
  prazo: string | null;
}

export interface PosicaoTarefa {
  id: string;
  status: StatusTarefa;
  posicao: number;
}

const PADRAO_DATA = /^\d{4}-\d{2}-\d{2}$/;

export function validarDadosTarefa(dados: DadosTarefa): DadosTarefa {
  const titulo = dados.titulo.trim();
  const descricao = dados.descricao.trim();
  const prazo = dados.prazo?.trim() || null;

  if (!titulo) {
    throw new ErroValidacao('O título é obrigatório.');
  }
  if (titulo.length > LIMITES_TAREFA.tituloMax) {
    throw new ErroValidacao(`O título deve ter no máximo ${LIMITES_TAREFA.tituloMax} caracteres.`);
  }
  if (descricao.length > LIMITES_TAREFA.descricaoMax) {
    throw new ErroValidacao(
      `A descrição deve ter no máximo ${LIMITES_TAREFA.descricaoMax} caracteres.`,
    );
  }
  if (!PRIORIDADES_TAREFA.includes(dados.prioridade)) {
    throw new ErroValidacao('Prioridade inválida.');
  }
  if (prazo && !PADRAO_DATA.test(prazo)) {
    throw new ErroValidacao('Prazo inválido.');
  }
  return { titulo, descricao, prioridade: dados.prioridade, prazo };
}

/** Data local de hoje no formato AAAA-MM-DD (mesmo formato do prazo). */
export function dataHoje(agora = new Date()): string {
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

export type SituacaoPrazo = 'atrasada' | 'hoje' | 'futura';

/** Situação do prazo. Tarefa concluída ou sem prazo não tem alerta (`null`). */
export function situacaoPrazo(tarefa: Tarefa, hoje: string): SituacaoPrazo | null {
  if (!tarefa.prazo || tarefa.status === 'done') {
    return null;
  }
  if (tarefa.prazo < hoje) {
    return 'atrasada';
  }
  return tarefa.prazo === hoje ? 'hoje' : 'futura';
}

export type FiltroTarefa = 'todas' | 'hoje' | 'atrasadas' | 'alta';

export const FILTROS_TAREFA: readonly FiltroTarefa[] = ['todas', 'hoje', 'atrasadas', 'alta'];

export const ROTULOS_FILTRO: Readonly<Record<FiltroTarefa, string>> = {
  todas: 'Todas',
  hoje: 'Para hoje',
  atrasadas: 'Atrasadas',
  alta: 'Alta prioridade',
};

/** Diz se a tarefa entra no filtro rápido escolhido. */
export function passaNoFiltro(tarefa: Tarefa, filtro: FiltroTarefa, hoje: string): boolean {
  switch (filtro) {
    case 'todas':
      return true;
    case 'hoje':
      return situacaoPrazo(tarefa, hoje) === 'hoje';
    case 'atrasadas':
      return situacaoPrazo(tarefa, hoje) === 'atrasada';
    case 'alta':
      return tarefa.prioridade === 'high' && tarefa.status !== 'done';
  }
}

/** Busca no título e na descrição, sem diferenciar maiúsculas nem acentos. */
export function passaNaBusca(tarefa: Tarefa, busca: string): boolean {
  const termo = normalizar(busca.trim());
  return !termo || normalizar(`${tarefa.titulo} ${tarefa.descricao}`).includes(termo);
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Tarefas de uma coluna, na ordem em que aparecem. */
export function tarefasPorStatus(tarefas: readonly Tarefa[], status: StatusTarefa): Tarefa[] {
  return tarefas.filter((tarefa) => tarefa.status === status).sort((a, b) => a.posicao - b.posicao);
}

/** Posição para uma tarefa nova entrar no fim da coluna. */
export function proximaPosicao(tarefas: readonly Tarefa[], status: StatusTarefa): number {
  return tarefasPorStatus(tarefas, status).reduce(
    (maior, tarefa) => Math.max(maior, tarefa.posicao + 1),
    0,
  );
}

/**
 * Move uma tarefa para `paraStatus` no índice `paraIndice` e renumera as colunas afetadas.
 * Não altera a lista original.
 */
export function moverTarefa(
  tarefas: readonly Tarefa[],
  tarefaId: string,
  paraStatus: StatusTarefa,
  paraIndice: number,
): Tarefa[] {
  const tarefa = tarefas.find((item) => item.id === tarefaId);
  if (!tarefa) {
    throw new ErroValidacao('Tarefa não encontrada.');
  }

  const destino = tarefasPorStatus(tarefas, paraStatus).filter((item) => item.id !== tarefaId);
  const indice = Math.max(0, Math.min(paraIndice, destino.length));
  destino.splice(indice, 0, { ...tarefa, status: paraStatus });

  const renumeradas = new Map<string, Tarefa>();
  destino.forEach((item, posicao) => renumeradas.set(item.id, { ...item, posicao }));

  if (tarefa.status !== paraStatus) {
    tarefasPorStatus(tarefas, tarefa.status)
      .filter((item) => item.id !== tarefaId)
      .forEach((item, posicao) => renumeradas.set(item.id, { ...item, posicao }));
  }

  return tarefas.map((item) => renumeradas.get(item.id) ?? item);
}

/** Só as tarefas que mudaram de coluna ou de posição (o que precisa ir para o banco). */
export function posicoesAlteradas(
  antes: readonly Tarefa[],
  depois: readonly Tarefa[],
): PosicaoTarefa[] {
  const anteriores = new Map(antes.map((tarefa) => [tarefa.id, tarefa]));
  return depois
    .filter((tarefa) => {
      const antiga = anteriores.get(tarefa.id);
      return !antiga || antiga.status !== tarefa.status || antiga.posicao !== tarefa.posicao;
    })
    .map(({ id, status, posicao }) => ({ id, status, posicao }));
}
