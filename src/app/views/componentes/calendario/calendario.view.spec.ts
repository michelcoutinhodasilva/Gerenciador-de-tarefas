import { TestBed } from '@angular/core/testing';
import { Tarefa } from '../../../models/entidades/tarefa';
import { CalendarioView } from './calendario.view';

function tarefa(id: string, criadaEm: string, entregueEm?: string): Tarefa {
  return {
    id,
    titulo: `Tarefa ${id}`,
    descricao: '',
    status: entregueEm ? 'done' : 'todo',
    prioridade: 'medium',
    prazo: null,
    posicao: 0,
    criadaEm,
    historico: entregueEm
      ? [
          { status: 'todo', desde: criadaEm },
          { status: 'done', desde: entregueEm },
        ]
      : [],
  };
}

function preparar(tarefas: Tarefa[]) {
  const fixture = TestBed.createComponent(CalendarioView);
  fixture.componentRef.setInput('tarefas', tarefas);
  fixture.componentRef.setInput('hoje', '2026-10-14');
  fixture.detectChanges();
  const abrir = vi.fn();
  fixture.componentInstance.abrir.subscribe(abrir);
  const elemento = fixture.nativeElement as HTMLElement;
  const clicar = (testid: string) => {
    elemento.querySelector<HTMLButtonElement>(`[data-testid="${testid}"]`)!.click();
    fixture.detectChanges();
  };
  return { elemento, abrir, clicar };
}

describe('CalendarioView', () => {
  const tarefas = [
    tarefa('a', '2026-10-05T08:00:00'),
    tarefa('b', '2026-10-01T08:00:00', '2026-10-05T17:00:00'),
  ];

  it('abre no mês de hoje mostrando as contagens do dia', () => {
    const { elemento } = preparar(tarefas);

    expect(elemento.querySelector('[data-testid="calendario-mes"]')?.textContent).toContain(
      'outubro de 2026',
    );
    const dia = elemento.querySelector('[data-testid="dia-2026-10-05"]')!;
    expect(dia.querySelector('.calendar-count--created')?.textContent).toBe('1');
    expect(dia.querySelector('.calendar-count--delivered')?.textContent).toBe('1');
  });

  it('ao clicar no dia, lista as tarefas criadas e entregues nele', () => {
    const { elemento, clicar } = preparar(tarefas);

    clicar('dia-2026-10-05');

    const nomes = (testid: string) =>
      [...elemento.querySelectorAll(`[data-testid="${testid}"]`)].map(
        (item) => item.querySelector('.calendar-task-title')?.textContent,
      );
    expect(nomes('criada')).toEqual(['Tarefa a']);
    expect(nomes('entregue')).toEqual(['Tarefa b']);
  });

  it('avisa quando o dia não tem tarefas', () => {
    const { elemento, clicar } = preparar(tarefas);

    clicar('dia-2026-10-20');

    expect(elemento.querySelector('[data-testid="detalhe-dia"]')?.textContent).toContain(
      'Nenhuma tarefa criada neste dia.',
    );
  });

  it('abre a tarefa clicada na lista do dia', () => {
    const { abrir, clicar } = preparar(tarefas);

    clicar('dia-2026-10-05');
    clicar('criada');

    expect(abrir).toHaveBeenCalledWith(tarefas[0]);
  });

  it('navega entre os meses', () => {
    const { elemento, clicar } = preparar(tarefas);

    clicar('mes-seguinte');

    expect(elemento.querySelector('[data-testid="calendario-mes"]')?.textContent).toContain(
      'novembro de 2026',
    );
  });
});
