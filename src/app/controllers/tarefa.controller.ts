import { computed, inject, Injectable, signal } from '@angular/core';
import {
  DadosTarefa,
  dataHoje,
  FILTROS_TAREFA,
  FiltroTarefa,
  moverTarefa,
  passaNaBusca,
  passaNoFiltro,
  posicoesAlteradas,
  proximaPosicao,
  ROTULOS_STATUS,
  STATUS_TAREFA,
  StatusTarefa,
  Tarefa,
  tarefasPorStatus,
} from '../models/entidades/tarefa';
import { TarefaModel } from '../models/tarefa.model';
import { Notificador } from '../nucleo/notificador';
import { mensagemErro } from './mensagem-erro';

export interface ColunaQuadro {
  status: StatusTarefa;
  rotulo: string;
  tarefas: Tarefa[];
}

/**
 * Controller do quadro: recebe as ações da View, chama o Model e guarda o estado da tela.
 * Fornecido pela própria View do quadro, então o estado some ao sair dela.
 */
@Injectable()
export class TarefaController {
  private readonly model = inject(TarefaModel);
  private readonly notificador = inject(Notificador);

  readonly tarefas = signal<Tarefa[]>([]);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly busca = signal('');
  readonly filtro = signal<FiltroTarefa>('todas');
  /** Data de referência para prazos; renovada a cada carregamento. */
  readonly hoje = signal(dataHoje());

  /** Com busca ou filtro ativo, a coluna mostra só parte das tarefas. */
  readonly filtrando = computed(() => this.busca().trim() !== '' || this.filtro() !== 'todas');

  private readonly tarefasVisiveis = computed(() =>
    this.tarefas().filter(
      (tarefa) =>
        passaNaBusca(tarefa, this.busca()) && passaNoFiltro(tarefa, this.filtro(), this.hoje()),
    ),
  );

  readonly colunas = computed<ColunaQuadro[]>(() =>
    STATUS_TAREFA.map((status) => ({
      status,
      rotulo: ROTULOS_STATUS[status],
      tarefas: tarefasPorStatus(this.tarefasVisiveis(), status),
    })),
  );

  /** Quantas tarefas cabem em cada filtro rápido (ignora a busca). */
  readonly contagemFiltros = computed(
    () =>
      Object.fromEntries(
        FILTROS_TAREFA.map((filtro) => [
          filtro,
          this.tarefas().filter((tarefa) => passaNoFiltro(tarefa, filtro, this.hoje())).length,
        ]),
      ) as Record<FiltroTarefa, number>,
  );

  readonly progresso = computed(() => {
    const total = this.tarefas().length;
    const concluidas = this.tarefas().filter((tarefa) => tarefa.status === 'done').length;
    return { concluidas, total, percentual: total ? Math.round((concluidas / total) * 100) : 0 };
  });

  limparFiltros(): void {
    this.busca.set('');
    this.filtro.set('todas');
  }

  async carregar(): Promise<void> {
    this.hoje.set(dataHoje());
    this.carregando.set(true);
    try {
      this.tarefas.set(await this.model.listar());
    } catch (erro) {
      this.falhar(erro, 'Não foi possível carregar as tarefas.');
    } finally {
      this.carregando.set(false);
    }
  }

  criar(dados: DadosTarefa, status: StatusTarefa = 'todo'): Promise<boolean> {
    return this.salvar('Tarefa criada.', 'Não foi possível criar a tarefa.', async () => {
      const tarefa = await this.model.criar(dados, status, proximaPosicao(this.tarefas(), status));
      this.tarefas.update((tarefas) => [...tarefas, tarefa]);
    });
  }

  atualizar(id: string, dados: DadosTarefa): Promise<boolean> {
    return this.salvar('Tarefa atualizada.', 'Não foi possível atualizar a tarefa.', async () => {
      const atualizada = await this.model.atualizar(id, dados);
      this.tarefas.update((tarefas) =>
        tarefas.map((tarefa) => (tarefa.id === id ? atualizada : tarefa)),
      );
    });
  }

  /** Remove da tela na hora e desfaz se o banco recusar. */
  async excluir(id: string): Promise<void> {
    const antes = this.tarefas();
    this.tarefas.set(antes.filter((tarefa) => tarefa.id !== id));
    try {
      await this.model.excluir(id);
      this.notificador.sucesso('Tarefa excluída.');
    } catch (erro) {
      this.tarefas.set(antes);
      this.falhar(erro, 'Não foi possível excluir a tarefa.');
    }
  }

  /** Move na tela na hora e desfaz se o banco recusar. Devolve `true` se ficou salvo. */
  async mover(id: string, paraStatus: StatusTarefa, paraIndice: number): Promise<boolean> {
    const antes = this.tarefas();
    const depois = moverTarefa(antes, id, paraStatus, paraIndice);
    const mudancas = posicoesAlteradas(antes, depois);
    if (mudancas.length === 0) {
      return true;
    }

    this.tarefas.set(depois);
    try {
      await this.model.salvarPosicoes(mudancas);
      return true;
    } catch (erro) {
      this.tarefas.set(antes);
      this.falhar(erro, 'Não foi possível mover a tarefa.');
      return false;
    }
  }

  /** Atalho: manda a tarefa para o fim de "Concluído". */
  async concluir(id: string): Promise<void> {
    const fim = tarefasPorStatus(this.tarefas(), 'done').length;
    if (await this.mover(id, 'done', fim)) {
      this.notificador.sucesso('Tarefa concluída.');
    }
  }

  private async salvar(
    mensagemSucesso: string,
    padrao: string,
    acao: () => Promise<void>,
  ): Promise<boolean> {
    this.salvando.set(true);
    try {
      await acao();
      this.notificador.sucesso(mensagemSucesso);
      return true;
    } catch (erro) {
      this.falhar(erro, padrao);
      return false;
    } finally {
      this.salvando.set(false);
    }
  }

  private falhar(erro: unknown, padrao: string): void {
    this.notificador.erro(mensagemErro(erro, padrao));
  }
}
