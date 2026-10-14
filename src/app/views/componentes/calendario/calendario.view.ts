import { DatePipe } from '@angular/common';
import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import {
  DiaCalendario,
  gradeDoMes,
  mesDe,
  mudarMes,
  tarefasDoDia,
} from '../../../models/entidades/calendario';
import { ROTULOS_STATUS, Tarefa } from '../../../models/entidades/tarefa';

const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const FORMATO_MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const FORMATO_DIA = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** Converte AAAA-MM-DD em Date local (sem pular de dia pelo fuso). */
function dataLocal(data: string): Date {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/** View: calendário com as tarefas criadas e entregues em cada dia. */
@Component({
  selector: 'app-calendario',
  imports: [DatePipe],
  templateUrl: './calendario.view.html',
  host: { class: 'block' },
})
export class CalendarioView {
  readonly tarefas = input.required<Tarefa[]>();
  /** Data de hoje (AAAA-MM-DD): mês inicial e destaque do dia atual. */
  readonly hoje = input.required<string>();
  readonly abrir = output<Tarefa>();

  protected readonly diasDaSemana = DIAS_DA_SEMANA;
  protected readonly rotulosStatus = ROTULOS_STATUS;

  protected readonly mes = linkedSignal(() => mesDe(this.hoje()));
  protected readonly selecionado = signal<string | null>(null);

  protected readonly grade = computed(() => gradeDoMes(this.mes(), this.tarefas()));
  protected readonly rotuloMes = computed(() => FORMATO_MES.format(dataLocal(`${this.mes()}-01`)));
  protected readonly doDia = computed(() => {
    const dia = this.selecionado();
    return dia ? tarefasDoDia(this.tarefas(), dia) : null;
  });
  protected readonly rotuloDia = computed(() => {
    const dia = this.selecionado();
    return dia ? FORMATO_DIA.format(dataLocal(dia)) : '';
  });

  protected navegar(delta: number): void {
    this.mes.update((mes) => mudarMes(mes, delta));
  }

  protected irParaHoje(): void {
    this.mes.set(mesDe(this.hoje()));
    this.selecionado.set(this.hoje());
  }

  protected escolher(dia: DiaCalendario): void {
    this.selecionado.set(dia.data);
    if (!dia.doMes) {
      this.mes.set(mesDe(dia.data));
    }
  }

  protected rotuloAcessivel(dia: DiaCalendario): string {
    return `${FORMATO_DIA.format(dataLocal(dia.data))}: ${dia.criadas} criadas, ${dia.entregues} entregues`;
  }
}
