import { TestBed } from '@angular/core/testing';
import { Tarefa } from '../../../models/entidades/tarefa';
import { CartaoTarefaView } from './cartao-tarefa.view';

const tarefa: Tarefa = {
  id: '1',
  titulo: 'Revisar proposta',
  descricao: 'Enviar até sexta',
  status: 'todo',
  prioridade: 'high',
  prazo: null,
  posicao: 0,
  criadaEm: '2026-10-02T12:00:00Z',
  historico: [],
};

async function preparar(campos: Partial<Tarefa> = {}) {
  const fixture = TestBed.createComponent(CartaoTarefaView);
  fixture.componentRef.setInput('tarefa', { ...tarefa, ...campos });
  fixture.componentRef.setInput('hoje', '2026-10-02');
  fixture.componentRef.setInput('agora', Date.parse('2026-10-02T15:30:00Z'));
  await fixture.whenStable();
  const elemento = fixture.nativeElement as HTMLElement;
  const texto = (testId: string) =>
    elemento.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();
  return { fixture, elemento, texto };
}

describe('CartaoTarefaView', () => {
  it('mostra título, descrição, prioridade e data', async () => {
    const { elemento, texto } = await preparar();

    expect(elemento.textContent).toContain('Revisar proposta');
    expect(elemento.textContent).toContain('Enviar até sexta');
    expect(elemento.textContent).toContain('02/10/2026');
    expect(texto('prioridade')).toBe('Urgente');
    expect(texto('prazo')).toBeUndefined();
  });

  it('avisa prazo atrasado e prazo de hoje', async () => {
    expect((await preparar({ prazo: '2026-09-30' })).texto('prazo')).toBe('Atrasada · 30/09');
    expect((await preparar({ prazo: '2026-10-02' })).texto('prazo')).toBe('Hoje · 02/10');
    expect((await preparar({ prazo: '2026-10-09' })).texto('prazo')).toBe('09/10');
  });

  it('mostra há quanto tempo a tarefa existe e está na coluna', async () => {
    const { texto } = await preparar();

    expect(texto('criada')).toContain('02/10/2026');
    expect(texto('criada')).toContain('há 3h 30min');
    expect(texto('na-coluna')).toBe('Nesta coluna há 3h 30min');
  });

  it('conta o tempo na coluna a partir da última troca de coluna', async () => {
    const { texto } = await preparar({
      historico: [
        { status: 'doing', desde: '2026-10-02T12:00:00Z' },
        { status: 'todo', desde: '2026-10-02T15:00:00Z' },
      ],
    });

    expect(texto('na-coluna')).toBe('Nesta coluna há 30 min');
  });

  it('avisa quando clicam em concluir, editar e excluir', async () => {
    const { fixture, elemento } = await preparar();
    const concluir = vi.fn();
    const editar = vi.fn();
    const excluir = vi.fn();
    fixture.componentInstance.concluir.subscribe(concluir);
    fixture.componentInstance.editar.subscribe(editar);
    fixture.componentInstance.excluir.subscribe(excluir);

    elemento.querySelector<HTMLButtonElement>('[data-testid="concluir"]')!.click();
    elemento.querySelector<HTMLButtonElement>('[data-testid="editar"]')!.click();
    elemento.querySelector<HTMLButtonElement>('[data-testid="excluir"]')!.click();

    expect(concluir).toHaveBeenCalledOnce();
    expect(editar).toHaveBeenCalledOnce();
    expect(excluir).toHaveBeenCalledOnce();
  });

  it('esconde o botão concluir em tarefa já concluída', async () => {
    const { elemento } = await preparar({ status: 'done' });

    expect(elemento.querySelector('[data-testid="concluir"]')).toBeNull();
  });
});
