import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENTE } from '../nucleo/supabase.cliente';
import {
  DadosTarefa,
  PosicaoTarefa,
  PrioridadeTarefa,
  StatusTarefa,
  Tarefa,
  validarDadosTarefa,
} from './entidades/tarefa';
import { ErroValidacao } from './entidades/erro-validacao';

/** Nomes da tabela e das colunas no banco (ficam em inglês). */
const TABELA = 'tasks';
/** Inclui o histórico de colunas (tabela task_status_history, preenchida por gatilho). */
const COLUNAS =
  'id, title, description, status, priority, due_date, position, created_at, ' +
  'task_status_history(status, changed_at)';

interface LinhaTarefa {
  id: string;
  title: string;
  description: string;
  status: StatusTarefa;
  priority: PrioridadeTarefa;
  due_date: string | null;
  position: number;
  created_at: string;
  task_status_history?: { status: StatusTarefa; changed_at: string }[] | null;
}

interface ResultadoConsulta<T> {
  data: T | null;
  error: { message: string } | null;
}

/** Model: dados e regras das tarefas. É a única camada que fala com o banco. */
@Injectable({ providedIn: 'root' })
export class TarefaModel {
  private readonly banco = inject(SUPABASE_CLIENTE);

  async listar(): Promise<Tarefa[]> {
    const resultado = await this.banco.from(TABELA).select(COLUNAS).order('position');
    return desembrulhar<LinhaTarefa[]>(resultado).map(paraTarefa);
  }

  async criar(dados: DadosTarefa, status: StatusTarefa, posicao: number): Promise<Tarefa> {
    const linha = paraLinha(validarDadosTarefa(dados));
    const resultado = await this.banco
      .from(TABELA)
      .insert({ ...linha, status, position: posicao })
      .select(COLUNAS)
      .single();
    return paraTarefa(desembrulhar<LinhaTarefa>(resultado));
  }

  /** Grava todas numa única chamada: ou entram todas, ou nenhuma. */
  async criarVarias(
    lista: readonly DadosTarefa[],
    status: StatusTarefa,
    posicaoInicial: number,
  ): Promise<Tarefa[]> {
    const linhas = lista.map((dados, indice) => ({
      ...paraLinha(validarItem(dados, indice)),
      status,
      position: posicaoInicial + indice,
    }));
    const resultado = await this.banco.from(TABELA).insert(linhas).select(COLUNAS);
    return desembrulhar<LinhaTarefa[]>(resultado)
      .map(paraTarefa)
      .sort((a, b) => a.posicao - b.posicao);
  }

  async atualizar(id: string, dados: DadosTarefa): Promise<Tarefa> {
    const linha = paraLinha(validarDadosTarefa(dados));
    const resultado = await this.banco
      .from(TABELA)
      .update(linha)
      .eq('id', id)
      .select(COLUNAS)
      .single();
    return paraTarefa(desembrulhar<LinhaTarefa>(resultado));
  }

  async excluir(id: string): Promise<void> {
    const resultado = await this.banco.from(TABELA).delete().eq('id', id);
    desembrulhar(resultado);
  }

  async salvarPosicoes(posicoes: readonly PosicaoTarefa[]): Promise<void> {
    const resultados = await Promise.all(
      posicoes.map(({ id, status, posicao }) =>
        this.banco.from(TABELA).update({ status, position: posicao }).eq('id', id),
      ),
    );
    resultados.forEach((resultado) => desembrulhar(resultado));
  }
}

function desembrulhar<T>({ data, error }: ResultadoConsulta<unknown>): T {
  if (error) {
    throw new Error(error.message);
  }
  return data as T;
}

/** Valida um item da lista e diz qual deles está errado. */
function validarItem(dados: DadosTarefa, indice: number): DadosTarefa {
  try {
    return validarDadosTarefa(dados);
  } catch (erro) {
    if (erro instanceof ErroValidacao) {
      throw new ErroValidacao(`Tarefa ${indice + 1}: ${erro.message}`);
    }
    throw erro;
  }
}

function paraLinha({ titulo, descricao, prioridade, prazo }: DadosTarefa) {
  return { title: titulo, description: descricao, priority: prioridade, due_date: prazo };
}

function paraTarefa(linha: LinhaTarefa): Tarefa {
  return {
    id: linha.id,
    titulo: linha.title,
    descricao: linha.description ?? '',
    status: linha.status,
    prioridade: linha.priority ?? 'medium',
    prazo: linha.due_date ?? null,
    posicao: linha.position,
    criadaEm: linha.created_at,
    historico: (linha.task_status_history ?? [])
      .map(({ status, changed_at }) => ({ status, desde: changed_at }))
      .sort((a, b) => Date.parse(a.desde) - Date.parse(b.desde)),
  };
}
