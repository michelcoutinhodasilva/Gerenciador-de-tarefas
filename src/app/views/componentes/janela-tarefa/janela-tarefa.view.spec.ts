import { TestBed } from '@angular/core/testing';
import { dataHoje, Tarefa } from '../../../models/entidades/tarefa';
import { JanelaTarefaView } from './janela-tarefa.view';

const tarefa: Tarefa = {
  id: '1',
  titulo: 'Corrigir login',
  descricao: '',
  status: 'doing',
  prioridade: 'high',
  prazo: null,
  posicao: 0,
  criadaEm: '2026-10-02T12:00:00Z',
  historico: [
    { status: 'todo', desde: '2026-10-02T12:00:00Z' },
    { status: 'doing', desde: '2026-10-02T14:00:00Z' },
  ],
};

async function preparar(aberta: Tarefa | null) {
  const fixture = TestBed.createComponent(JanelaTarefaView);
  fixture.componentRef.setInput('tarefa', aberta);
  fixture.componentRef.setInput('agora', Date.parse('2026-10-02T14:30:00Z'));
  fixture.componentInstance.visivel.set(true);
  await fixture.whenStable();
  /** O diálogo do PrimeNG pode ser desenhado fora do componente, então busca na página toda. */
  const historico = () => document.querySelector('[data-testid="historico"]');
  return { fixture, historico };
}

describe('JanelaTarefaView', () => {
  afterEach(() =>
    document.querySelectorAll('.p-dialog-mask, p-dialog').forEach((no) => no.remove()),
  );

  it('mostra o tempo em cada coluna da tarefa aberta', async () => {
    const { historico } = await preparar(tarefa);

    const texto = historico()?.textContent ?? '';
    expect(texto).toContain('A fazer');
    expect(texto).toContain('2h');
    expect(texto).toContain('Em andamento (agora)');
    expect(texto).toContain('30 min');
    expect(texto).toContain('—');
  });

  it('não mostra tempos ao criar uma tarefa nova', async () => {
    const { historico } = await preparar(null);

    expect(historico()).toBeNull();
  });

  const criarOutra = () => document.querySelector<HTMLInputElement>('[data-testid="criar-outra"]');

  it('mostra "Criar outra" só ao criar, e marcar liga a opção', async () => {
    const { fixture } = await preparar(null);

    criarOutra()!.click();

    expect(fixture.componentInstance.criarOutra()).toBe(true);
  });

  it('não mostra "Criar outra" ao editar', async () => {
    await preparar(tarefa);

    expect(criarOutra()).toBeNull();
  });

  it('prepara a próxima: limpa título e descrição e mantém prioridade e prazo', async () => {
    const { fixture } = await preparar(null);
    const salvar = vi.fn();
    fixture.componentInstance.salvar.subscribe(salvar);
    const titulo = document.querySelector<HTMLInputElement>('[data-testid="titulo"]')!;
    titulo.value = 'Primeira';
    titulo.dispatchEvent(new Event('input'));
    document.querySelector<HTMLButtonElement>('.quick-date-button')!.click();

    fixture.componentInstance.prepararProxima();
    document.querySelector<HTMLFormElement>('.task-dialog-form')!.requestSubmit();

    expect(titulo.value).toBe('');
    expect(document.activeElement).toBe(titulo);
    expect(salvar).toHaveBeenCalledWith({
      titulo: '',
      descricao: '',
      prioridade: 'medium',
      prazo: dataHoje(),
    });
  });
});
