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
};

async function preparar(campos: Partial<Tarefa> = {}) {
  const fixture = TestBed.createComponent(CartaoTarefaView);
  fixture.componentRef.setInput('tarefa', { ...tarefa, ...campos });
  fixture.componentRef.setInput('hoje', '2026-10-02');
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
    expect(texto('prioridade')).toBe('Alta');
    expect(texto('prazo')).toBeUndefined();
  });

  it('avisa prazo atrasado e prazo de hoje', async () => {
    expect((await preparar({ prazo: '2026-09-30' })).texto('prazo')).toBe('Atrasada · 30/09');
    expect((await preparar({ prazo: '2026-10-02' })).texto('prazo')).toBe('Hoje · 02/10');
    expect((await preparar({ prazo: '2026-10-09' })).texto('prazo')).toBe('09/10');
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
