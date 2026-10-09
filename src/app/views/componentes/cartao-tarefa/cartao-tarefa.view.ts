import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import {
  entradaNaColuna,
  PrioridadeTarefa,
  ROTULOS_PRIORIDADE,
  SituacaoPrazo,
  situacaoPrazo,
  Tarefa,
} from '../../../models/entidades/tarefa';
import { formatarDuracao } from '../../../nucleo/duracao';

const ESTILOS_PRIORIDADE: Readonly<Record<PrioridadeTarefa, string>> = {
  low: 'task-priority--low',
  medium: 'task-priority--medium',
  high: 'task-priority--high',
};

const ESTILOS_PRAZO: Readonly<Record<SituacaoPrazo | 'sem', string>> = {
  atrasada: 'task-due--overdue',
  hoje: 'task-due--today',
  futura: 'task-due--upcoming',
  sem: 'task-due--none',
};

const PREFIXO_PRAZO: Readonly<Partial<Record<SituacaoPrazo, string>>> = {
  atrasada: 'Atrasada · ',
  hoje: 'Hoje · ',
};

/** View: cartão de uma tarefa. Só mostra e avisa os cliques. */
@Component({
  selector: 'app-cartao-tarefa',
  imports: [DatePipe],
  templateUrl: './cartao-tarefa.view.html',
  host: { class: 'block' },
})
export class CartaoTarefaView {
  readonly tarefa = input.required<Tarefa>();
  /** Data de hoje (AAAA-MM-DD) usada para avisar prazos. */
  readonly hoje = input.required<string>();
  /** Hora atual (ms) usada para os tempos da tarefa. */
  readonly agora = input.required<number>();
  readonly editar = output<void>();
  readonly excluir = output<void>();
  readonly concluir = output<void>();

  protected readonly rotuloPrioridade = computed(
    () => ROTULOS_PRIORIDADE[this.tarefa().prioridade],
  );
  protected readonly estiloPrioridade = computed(
    () => ESTILOS_PRIORIDADE[this.tarefa().prioridade],
  );

  private readonly situacao = computed(() => situacaoPrazo(this.tarefa(), this.hoje()));
  protected readonly estiloPrazo = computed(() => ESTILOS_PRAZO[this.situacao() ?? 'sem']);
  protected readonly prefixoPrazo = computed(
    () => PREFIXO_PRAZO[this.situacao() ?? 'futura'] ?? '',
  );
  protected readonly atrasada = computed(() => this.situacao() === 'atrasada');

  protected readonly idade = computed(() =>
    formatarDuracao(this.agora() - Date.parse(this.tarefa().criadaEm)),
  );
  protected readonly tempoNaColuna = computed(() =>
    formatarDuracao(this.agora() - Date.parse(entradaNaColuna(this.tarefa()))),
  );
}
