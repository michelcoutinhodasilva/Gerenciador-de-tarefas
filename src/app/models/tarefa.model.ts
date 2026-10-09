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

/** Nomes da tabela e das colunas no banco (ficam em inglês). */
const TABELA = 'tasks';
const COLUNAS = 'id, title, description, status, priority, due_date, position, created_at';

interface LinhaTarefa {
  id: string;
  title: string;
  description: string;
  status: StatusTarefa;
  priority: PrioridadeTarefa;
  due_date: string | null;
  position: number;
  created_at: string;
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
  };
}
