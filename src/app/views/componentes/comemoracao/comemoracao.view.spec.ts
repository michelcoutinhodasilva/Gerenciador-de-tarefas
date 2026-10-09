import { TestBed } from '@angular/core/testing';
import { Conquista } from '../../../controllers/tarefa.controller';
import { ComemoracaoView, DURACAO_COMEMORACAO } from './comemoracao.view';

function preparar(conquista: Conquista | null) {
  const fixture = TestBed.createComponent(ComemoracaoView);
  fixture.componentRef.setInput('conquista', conquista);
  fixture.detectChanges();
  const fechar = vi.fn();
  fixture.componentInstance.fechar.subscribe(fechar);
  return { fixture, fechar, elemento: fixture.nativeElement as HTMLElement };
}

describe('ComemoracaoView', () => {
  afterEach(() => vi.useRealTimers());

  it('não mostra nada sem conquista', () => {
    const { elemento } = preparar(null);

    expect(elemento.querySelector('.comemoracao')).toBeNull();
  });

  it('comemora a tarefa concluída mostrando o título', () => {
    const { elemento } = preparar({ id: 1, tipo: 'tarefa', titulo: 'Enviar relatório' });

    const bloco = elemento.querySelector('[data-testid="comemoracao-tarefa"]');
    expect(bloco?.textContent).toContain('Tarefa concluída');
    expect(bloco?.textContent).toContain('Enviar relatório');
  });

  it('comemora o dia 100% com botão para continuar', () => {
    const { elemento, fechar } = preparar({ id: 1, tipo: 'dia', titulo: 'x' });

    expect(elemento.textContent).toContain('Dia 100% concluído!');
    elemento.querySelector<HTMLButtonElement>('[data-testid="fechar-comemoracao"]')!.click();

    expect(fechar).toHaveBeenCalled();
  });

  it('some sozinha depois do tempo da comemoração', () => {
    vi.useFakeTimers();
    const { fechar } = preparar({ id: 1, tipo: 'tarefa', titulo: 'x' });

    vi.advanceTimersByTime(DURACAO_COMEMORACAO.tarefa - 1);
    expect(fechar).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fechar).toHaveBeenCalledOnce();
  });

  it('fecha com Esc', () => {
    const { fechar } = preparar({ id: 1, tipo: 'dia', titulo: 'x' });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(fechar).toHaveBeenCalledOnce();
  });
});
