import { CdkDragDrop, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { AutenticacaoController } from '../../controllers/autenticacao.controller';
import { TarefaController } from '../../controllers/tarefa.controller';
import {
  DadosTarefa,
  FILTROS_TAREFA,
  ROTULOS_FILTRO,
  StatusTarefa,
  Tarefa,
} from '../../models/entidades/tarefa';
import { ColunaKanbanView } from '../componentes/coluna-kanban/coluna-kanban.view';
import { ComemoracaoView } from '../componentes/comemoracao/comemoracao.view';
import { JanelaTarefaView } from '../componentes/janela-tarefa/janela-tarefa.view';

/** View: tela do quadro Kanban. Toda ação é repassada aos controllers. */
@Component({
  selector: 'app-quadro-view',
  imports: [CdkDropListGroup, Button, ColunaKanbanView, JanelaTarefaView, ComemoracaoView],
  providers: [TarefaController],
  templateUrl: './quadro.view.html',
  host: { '(document:keydown)': 'aoAtalho($event)' },
})
export class QuadroView implements OnInit {
  protected readonly tarefas = inject(TarefaController);
  protected readonly autenticacao = inject(AutenticacaoController);
  private readonly confirmacao = inject(ConfirmationService);

  protected readonly janelaAberta = signal(false);
  protected readonly editando = signal<Tarefa | null>(null);
  private readonly statusNovaTarefa = signal<StatusTarefa>('todo');
  private readonly campoBusca = viewChild<ElementRef<HTMLInputElement>>('busca');
  private readonly janela = viewChild(JanelaTarefaView);

  protected readonly filtros = FILTROS_TAREFA.map((valor) => ({
    valor,
    rotulo: ROTULOS_FILTRO[valor],
  }));

  protected readonly resumo = computed(() => {
    const contagem: Record<StatusTarefa, number> = { todo: 0, doing: 0, done: 0 };
    for (const tarefa of this.tarefas.tarefas()) {
      contagem[tarefa.status] += 1;
    }
    return contagem;
  });

  protected readonly rotuloData = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  ngOnInit(): void {
    this.tarefas.carregar();
  }

  protected abrirCriacao(status: StatusTarefa = 'todo'): void {
    this.editando.set(null);
    this.statusNovaTarefa.set(status);
    this.janelaAberta.set(true);
  }

  protected abrirEdicao(tarefa: Tarefa): void {
    this.editando.set(tarefa);
    this.janelaAberta.set(true);
  }

  protected async salvar(dados: DadosTarefa): Promise<void> {
    const tarefa = this.editando();
    const salvou = tarefa
      ? await this.tarefas.atualizar(tarefa.id, dados)
      : await this.tarefas.criar(dados, this.statusNovaTarefa());
    if (!salvou) {
      return;
    }
    const janela = this.janela();
    if (!tarefa && janela?.criarOutra()) {
      janela.prepararProxima();
    } else {
      this.janelaAberta.set(false);
    }
  }

  protected confirmarExclusao(tarefa: Tarefa): void {
    this.confirmacao.confirm({
      header: 'Excluir tarefa',
      message: `Excluir "${tarefa.titulo}"? Essa ação não pode ser desfeita.`,
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: () => this.tarefas.excluir(tarefa.id),
    });
  }

  protected soltar(evento: CdkDragDrop<StatusTarefa, StatusTarefa, Tarefa>): void {
    this.tarefas.mover(evento.item.data.id, evento.container.data, evento.currentIndex);
  }

  /** Atalhos estilo Linear: "C" cria uma tarefa e "/" vai para a busca. */
  protected aoAtalho(evento: KeyboardEvent): void {
    const alvo = evento.target as HTMLElement | null;
    const digitando = alvo?.closest('input, textarea, [contenteditable="true"]');
    if (digitando || this.janelaAberta() || evento.ctrlKey || evento.metaKey || evento.altKey) {
      return;
    }

    const tecla = evento.key.toLowerCase();
    if (tecla === 'c') {
      evento.preventDefault();
      this.abrirCriacao();
    } else if (tecla === '/') {
      evento.preventDefault();
      this.campoBusca()?.nativeElement.focus();
    }
  }

  /** Esc na busca limpa o texto e tira o foco. */
  protected limparBusca(campo: HTMLInputElement): void {
    this.tarefas.busca.set('');
    campo.blur();
  }
}
