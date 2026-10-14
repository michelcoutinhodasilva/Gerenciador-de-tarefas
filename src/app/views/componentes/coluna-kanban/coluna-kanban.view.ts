import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, computed, input, output } from '@angular/core';
import { StatusTarefa, Tarefa } from '../../../models/entidades/tarefa';
import { CartaoTarefaView } from '../cartao-tarefa/cartao-tarefa.view';

const CORES_STATUS: Readonly<Record<StatusTarefa, string>> = {
  waiting: 'column-status-dot--waiting',
  todo: 'column-status-dot--todo',
  doing: 'column-status-dot--doing',
  done: 'column-status-dot--done',
};

/** View: uma coluna do Kanban. Repassa as ações para a tela do quadro. */
@Component({
  selector: 'app-coluna-kanban',
  imports: [CdkDropList, CdkDrag, CartaoTarefaView],
  templateUrl: './coluna-kanban.view.html',
  host: { class: 'flex' },
})
export class ColunaKanbanView {
  readonly status = input.required<StatusTarefa>();
  readonly rotulo = input.required<string>();
  readonly tarefas = input.required<Tarefa[]>();
  readonly hoje = input.required<string>();
  /** Hora atual (ms) repassada aos cartões para os tempos. */
  readonly agora = input.required<number>();
  /** Com busca/filtro a coluna está incompleta, então arrastar salvaria a posição errada. */
  readonly filtrando = input(false);

  readonly adicionar = output<void>();
  readonly editar = output<Tarefa>();
  readonly excluir = output<Tarefa>();
  readonly concluir = output<Tarefa>();
  readonly soltou = output<CdkDragDrop<StatusTarefa, StatusTarefa, Tarefa>>();

  protected readonly corPonto = computed(() => CORES_STATUS[this.status()]);
}
