import { TestBed } from '@angular/core/testing';
import { Tarefa } from '../../../models/entidades/tarefa';
import { ColunaKanbanView } from './coluna-kanban.view';

const tarefas: Tarefa[] = [
  {
    id: '1',
    titulo: 'Primeira',
    descricao: '',
    status: 'doing',
    prioridade: 'medium',
    prazo: null,
    posicao: 0,
    criadaEm: '2026-10-02',
    historico: [],
  },
  {
    id: '2',
    titulo: 'Segunda',
    descricao: '',
    status: 'doing',
    prioridade: 'medium',
    prazo: null,
    posicao: 1,
    criadaEm: '2026-10-02',
    historico: [],
  },
];

async function preparar(itens: Tarefa[], filtrando = false) {
  const fixture = TestBed.createComponent(ColunaKanbanView);
  fixture.componentRef.setInput('status', 'doing');
  fixture.componentRef.setInput('rotulo', 'Em andamento');
  fixture.componentRef.setInput('tarefas', itens);
  fixture.componentRef.setInput('hoje', '2026-10-02');
  fixture.componentRef.setInput('agora', Date.parse('2026-10-02T15:30:00Z'));
  fixture.componentRef.setInput('filtrando', filtrando);
  await fixture.whenStable();
  return { fixture, elemento: fixture.nativeElement as HTMLElement };
}

describe('ColunaKanbanView', () => {
  it('mostra o nome, o total e os cartões', async () => {
    const { elemento } = await preparar(tarefas);

    expect(elemento.querySelector('h2')?.textContent).toContain('Em andamento');
    expect(elemento.querySelector('[data-testid="total"]')?.textContent).toBe('2');
    expect(elemento.querySelectorAll('app-cartao-tarefa').length).toBe(2);
  });

  it('mostra aviso quando a coluna está vazia', async () => {
    const { elemento } = await preparar([]);

    expect(elemento.textContent).toContain('Arraste uma tarefa para cá');
  });

  it('avisa que nada foi encontrado quando há filtro', async () => {
    const { elemento } = await preparar([], true);

    expect(elemento.textContent).toContain('Nenhuma tarefa encontrada');
  });

  it('repassa o pedido de concluir com a tarefa certa', async () => {
    const { fixture, elemento } = await preparar(tarefas);
    const concluir = vi.fn();
    fixture.componentInstance.concluir.subscribe(concluir);

    elemento.querySelectorAll<HTMLButtonElement>('[data-testid="concluir"]')[0].click();

    expect(concluir).toHaveBeenCalledWith(tarefas[0]);
  });

  it('repassa o pedido de excluir com a tarefa certa', async () => {
    const { fixture, elemento } = await preparar(tarefas);
    const excluir = vi.fn();
    fixture.componentInstance.excluir.subscribe(excluir);

    elemento.querySelectorAll<HTMLButtonElement>('[data-testid="excluir"]')[1].click();

    expect(excluir).toHaveBeenCalledWith(tarefas[1]);
  });

  it('avisa quando clicam em adicionar', async () => {
    const { fixture, elemento } = await preparar(tarefas);
    const adicionar = vi.fn();
    fixture.componentInstance.adicionar.subscribe(adicionar);

    elemento.querySelector<HTMLButtonElement>('[data-testid="adicionar"]')!.click();

    expect(adicionar).toHaveBeenCalledOnce();
  });
});
