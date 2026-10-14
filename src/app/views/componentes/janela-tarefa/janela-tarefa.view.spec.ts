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

  it('mostra quando foi concluída só se a tarefa estiver concluída', async () => {
    const concluidaEm = () => document.querySelector('[data-testid="concluida-em"]');
    const concluida: Tarefa = {
      ...tarefa,
      status: 'done',
      historico: [...tarefa.historico, { status: 'done', desde: '2026-10-03T15:20:00' }],
    };

    await preparar(tarefa);
    expect(concluidaEm()).toBeNull();
    document.querySelectorAll('.p-dialog-mask, p-dialog').forEach((no) => no.remove());

    await preparar(concluida);
    expect(concluidaEm()?.textContent).toContain('Concluída em 03/10/2026 às 15:20');
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

  const aguardaAprovacao = () =>
    document.querySelector<HTMLInputElement>('[data-testid="aguarda-aprovacao"]');

  it('marcar "Aguarda aprovação" cria em "Aguardando aprovação"; desmarcar volta para "A fazer"', async () => {
    const { fixture } = await preparar(null);

    aguardaAprovacao()!.click();
    expect(fixture.componentInstance.status()).toBe('waiting');

    aguardaAprovacao()!.click();
    expect(fixture.componentInstance.status()).toBe('todo');
  });

  it('não mostra "Aguarda aprovação" ao editar', async () => {
    await preparar(tarefa);

    expect(aguardaAprovacao()).toBeNull();
  });

  /** Simula colar `texto` no campo de título. */
  function colarNoTitulo(texto: string): Event {
    const evento = new Event('paste', { cancelable: true });
    Object.defineProperty(evento, 'clipboardData', { value: { getData: () => texto } });
    document.querySelector('[data-testid="titulo"]')!.dispatchEvent(evento);
    return evento;
  }

  const listaColada = () => document.querySelector('[data-testid="lista-colada"]');

  it('colar uma lista mostra as tarefas e cria todas de uma vez', async () => {
    const { fixture } = await preparar(null);
    const salvarVarias = vi.fn();
    fixture.componentInstance.salvarVarias.subscribe(salvarVarias);

    const evento = colarNoTitulo('Tarefa 1 - Um\nTarefa 2 - Dois\ndetalhe do dois');
    await fixture.whenStable();
    document.querySelector<HTMLFormElement>('.task-dialog-form')!.requestSubmit();

    expect(evento.defaultPrevented).toBe(true);
    expect(listaColada()?.textContent).toContain('2 tarefas encontradas');
    expect(document.querySelector('.dialog-save-action')?.textContent).toContain('Criar 2 tarefas');
    expect(salvarVarias).toHaveBeenCalledWith([
      { titulo: 'Um', descricao: '', prioridade: 'medium', prazo: null },
      { titulo: 'Dois', descricao: 'detalhe do dois', prioridade: 'medium', prazo: null },
    ]);
  });

  it('"Usar como uma tarefa só" volta ao formulário com o texto numa tarefa', async () => {
    const { fixture } = await preparar(null);

    colarNoTitulo('Reunião\nPauta: metas');
    await fixture.whenStable();
    document.querySelector<HTMLButtonElement>('[data-testid="usar-uma"]')!.click();
    await fixture.whenStable();

    expect(listaColada()).toBeNull();
    expect(document.querySelector<HTMLInputElement>('[data-testid="titulo"]')!.value).toBe(
      'Reunião',
    );
    expect(document.querySelector<HTMLTextAreaElement>('[data-testid="descricao"]')!.value).toBe(
      'Pauta: metas',
    );
  });

  it('colar uma linha só ou colar ao editar não vira lista', async () => {
    const { fixture } = await preparar(tarefa);

    const evento = colarNoTitulo('Um\nDois');
    await fixture.whenStable();

    expect(evento.defaultPrevented).toBe(false);
    expect(listaColada()).toBeNull();
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
