import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { SelectButton } from 'primeng/selectbutton';
import { Textarea } from 'primeng/textarea';
import { comoUmaTarefa, ItemLista, separarLista } from '../../../models/entidades/lista-tarefas';
import {
  DadosTarefa,
  dataHoje,
  entradaNaColuna,
  LIMITES_TAREFA,
  PRIORIDADES_TAREFA,
  PrioridadeTarefa,
  ROTULOS_PRIORIDADE,
  ROTULOS_STATUS,
  STATUS_TAREFA,
  StatusTarefa,
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
  /** Ao criar: coluna onde a tarefa nova entra. */
  readonly status = model<StatusTarefa>('todo');
  readonly salvar = output<DadosTarefa>();
  /** Lista colada no título: entrega todas as tarefas de uma vez. */
  readonly salvarVarias = output<DadosTarefa[]>();
  /** Ao criar: depois de salvar, a janela continua aberta para a próxima tarefa. */
  readonly criarOutra = signal(false);
  /** Tarefas encontradas no texto colado (vazio = formulário normal). */
  protected readonly itensColados = signal<ItemLista[]>([]);
  private textoColado = '';

  private readonly campoTitulo = viewChild<ElementRef<HTMLInputElement>>('campoTitulo');

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

  /** Quando a tarefa entrou em "Concluído" (ISO); `null` se não está concluída. */
  protected readonly concluidaEm = computed(() => {
    const tarefa = this.tarefa();
    return tarefa?.status === 'done' ? entradaNaColuna(tarefa) : null;
  });

  protected readonly rotuloSalvar = computed(() => {
    if (this.tarefa()) {
      return 'Salvar';
    }
    const total = this.itensColados().length;
    return total ? `Criar ${total} tarefas` : 'Criar tarefa';
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
        this.itensColados.set([]);
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

  /** Limpa título e descrição para a próxima tarefa; mantém prioridade e prazo. */
  prepararProxima(): void {
    this.formulario.patchValue({ titulo: '', descricao: '' });
    this.campoTitulo()?.nativeElement.focus();
  }

  /** Ao criar, colar texto com várias tarefas no título mostra a lista antes de criar. */
  protected aoColar(evento: ClipboardEvent): void {
    const texto = evento.clipboardData?.getData('text') ?? '';
    const itens = this.tarefa() ? [] : separarLista(texto);
    if (itens.length < 2) {
      return;
    }
    evento.preventDefault();
    this.textoColado = texto;
    this.itensColados.set(itens);
  }

  /** Desiste da lista: o texto colado vira uma tarefa só (1ª linha no título). */
  protected usarComoUma(): void {
    this.formulario.patchValue(comoUmaTarefa(this.textoColado));
    this.itensColados.set([]);
  }

  protected enviar(): void {
    const valor = this.formulario.getRawValue();
    const prazo = valor.prazo || null;
    const itens = this.itensColados();
    if (itens.length) {
      this.salvarVarias.emit(
        itens.map((item) => ({ ...item, prioridade: valor.prioridade, prazo })),
      );
      return;
    }
    this.salvar.emit({ ...valor, prazo });
  }
}
