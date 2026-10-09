import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, model, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { SelectButton } from 'primeng/selectbutton';
import { Textarea } from 'primeng/textarea';
import {
  DadosTarefa,
  dataHoje,
  LIMITES_TAREFA,
  PRIORIDADES_TAREFA,
  PrioridadeTarefa,
  ROTULOS_PRIORIDADE,
  ROTULOS_STATUS,
  STATUS_TAREFA,
  Tarefa,
  tempoPorStatus,
} from '../../../models/entidades/tarefa';
import { formatarDuracao } from '../../../nucleo/duracao';

/** View: janela para criar ou editar uma tarefa. Entrega os dados digitados em `salvar`. */
@Component({
  selector: 'app-janela-tarefa',
  imports: [ReactiveFormsModule, DatePipe, Dialog, Button, InputText, SelectButton, Textarea],
  templateUrl: './janela-tarefa.view.html',
})
export class JanelaTarefaView {
  readonly visivel = model(false);
  readonly tarefa = input<Tarefa | null>(null);
  /** Hora atual (ms) para calcular o tempo em cada coluna. */
  readonly agora = input(0);
  readonly salvando = input(false);
  readonly salvar = output<DadosTarefa>();

  /** Tempo em cada coluna da tarefa aberta ("—" onde ela nunca esteve). */
  protected readonly temposPorColuna = computed(() => {
    const tarefa = this.tarefa();
    if (!tarefa) {
      return [];
    }
    const tempos = tempoPorStatus(tarefa, this.agora());
    return STATUS_TAREFA.map((status) => ({
      status,
      rotulo: ROTULOS_STATUS[status],
      tempo: tempos[status] ? formatarDuracao(tempos[status]) : '—',
      atual: status === tarefa.status,
    }));
  });

  protected readonly limites = LIMITES_TAREFA;
  protected readonly prioridades = PRIORIDADES_TAREFA.map((valor) => ({
    valor,
    rotulo: ROTULOS_PRIORIDADE[valor],
  }));
  protected readonly formulario = inject(NonNullableFormBuilder).group({
    titulo: '',
    descricao: '',
    prioridade: 'medium' as PrioridadeTarefa,
    prazo: '',
  });

  constructor() {
    effect(() => {
      if (this.visivel()) {
        const tarefa = this.tarefa();
        this.formulario.reset({
          titulo: tarefa?.titulo ?? '',
          descricao: tarefa?.descricao ?? '',
          prioridade: tarefa?.prioridade ?? 'medium',
          prazo: tarefa?.prazo ?? '',
        });
      }
    });
  }

  /** Atalho para o prazo: 0 = hoje, 1 = amanhã. */
  protected definirPrazo(diasAPartirDeHoje: number): void {
    const data = new Date();
    data.setDate(data.getDate() + diasAPartirDeHoje);
    this.formulario.controls.prazo.setValue(dataHoje(data));
  }

  protected enviar(): void {
    const valor = this.formulario.getRawValue();
    this.salvar.emit({ ...valor, prazo: valor.prazo || null });
  }
}
