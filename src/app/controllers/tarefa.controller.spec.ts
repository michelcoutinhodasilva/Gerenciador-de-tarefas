import { TestBed } from '@angular/core/testing';
import { DadosTarefa, dataHoje, StatusTarefa, Tarefa } from '../models/entidades/tarefa';
import { ErroValidacao } from '../models/entidades/erro-validacao';
import { TarefaModel } from '../models/tarefa.model';
import { Notificador } from '../nucleo/notificador';
import { TarefaController } from './tarefa.controller';

function tarefa(id: string, status: StatusTarefa = 'todo', posicao = 0): Tarefa {
  return {
    id,
    titulo: id,
    descricao: '',
    status,
    prioridade: 'medium',
    prazo: null,
    posicao,
    criadaEm: '2026-10-02T00:00:00Z',
    historico: [],
  };
}

const vazio: DadosTarefa = { titulo: '', descricao: '', prioridade: 'medium', prazo: null };

function preparar(iniciais: Tarefa[] = []) {
  const model = {
    listar: vi.fn().mockResolvedValue(iniciais),
    criar: vi.fn(),
    criarVarias: vi.fn(),
    atualizar: vi.fn(),
    excluir: vi.fn().mockResolvedValue(undefined),
    salvarPosicoes: vi.fn().mockResolvedValue(undefined),
  };
  const notificador = { sucesso: vi.fn(), erro: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      TarefaController,
      { provide: TarefaModel, useValue: model },
      { provide: Notificador, useValue: notificador },
    ],
  });
  return { controller: TestBed.inject(TarefaController), model, notificador };
}

describe('TarefaController', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));

  it('carrega as tarefas e monta as colunas', async () => {
    const { controller } = preparar([tarefa('a'), tarefa('b', 'done')]);

    await controller.carregar();

    expect(controller.carregando()).toBe(false);
    expect(controller.colunas().map((coluna) => coluna.tarefas.length)).toEqual([1, 0, 1]);
    expect(controller.colunas()[0].rotulo).toBe('A fazer');
  });

  it('avisa quando não consegue carregar', async () => {
    const { controller, model, notificador } = preparar();
    model.listar.mockRejectedValue(new Error('offline'));

    await controller.carregar();

    expect(notificador.erro).toHaveBeenCalledWith('Não foi possível carregar as tarefas.');
  });

  it('cria a tarefa no fim da coluna', async () => {
    const { controller, model, notificador } = preparar([tarefa('a', 'todo', 0)]);
    await controller.carregar();
    model.criar.mockResolvedValue(tarefa('b', 'todo', 1));

    const salvou = await controller.criar({ ...vazio, titulo: 'b' }, 'todo');

    expect(salvou).toBe(true);
    expect(model.criar).toHaveBeenCalledWith({ ...vazio, titulo: 'b' }, 'todo', 1);
    expect(controller.tarefas().map((item) => item.id)).toEqual(['a', 'b']);
    expect(notificador.sucesso).toHaveBeenCalledWith('Tarefa criada.');
  });

  it('cria várias tarefas no fim da coluna', async () => {
    const { controller, model, notificador } = preparar([tarefa('a', 'todo', 0)]);
    await controller.carregar();
    model.criarVarias.mockResolvedValue([tarefa('b', 'todo', 1), tarefa('c', 'todo', 2)]);
    const lista = [
      { ...vazio, titulo: 'b' },
      { ...vazio, titulo: 'c' },
    ];

    const salvou = await controller.criarVarias(lista, 'todo');

    expect(salvou).toBe(true);
    expect(model.criarVarias).toHaveBeenCalledWith(lista, 'todo', 1);
    expect(controller.tarefas().map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(notificador.sucesso).toHaveBeenCalledWith('2 tarefas criadas.');
  });

  it('não muda nada na tela quando a criação em lista falha', async () => {
    const { controller, model, notificador } = preparar([tarefa('a')]);
    await controller.carregar();
    model.criarVarias.mockRejectedValue(new ErroValidacao('Tarefa 2: O título é obrigatório.'));

    const salvou = await controller.criarVarias([vazio, vazio]);

    expect(salvou).toBe(false);
    expect(controller.tarefas().map((item) => item.id)).toEqual(['a']);
    expect(notificador.erro).toHaveBeenCalledWith('Tarefa 2: O título é obrigatório.');
  });

  it('mostra a mensagem da regra de negócio quando a criação falha', async () => {
    const { controller, model, notificador } = preparar();
    model.criar.mockRejectedValue(new ErroValidacao('O título é obrigatório.'));

    const salvou = await controller.criar(vazio);

    expect(salvou).toBe(false);
    expect(notificador.erro).toHaveBeenCalledWith('O título é obrigatório.');
    expect(controller.salvando()).toBe(false);
  });

  it('atualiza a tarefa na lista', async () => {
    const { controller, model } = preparar([tarefa('a')]);
    await controller.carregar();
    model.atualizar.mockResolvedValue({ ...tarefa('a'), titulo: 'Novo título' });

    await controller.atualizar('a', { ...vazio, titulo: 'Novo título' });

    expect(controller.tarefas()[0].titulo).toBe('Novo título');
  });

  it('exclui a tarefa', async () => {
    const { controller, model } = preparar([tarefa('a'), tarefa('b', 'todo', 1)]);
    await controller.carregar();

    await controller.excluir('a');

    expect(model.excluir).toHaveBeenCalledWith('a');
    expect(controller.tarefas().map((item) => item.id)).toEqual(['b']);
  });

  it('devolve a tarefa à tela se a exclusão falhar', async () => {
    const { controller, model, notificador } = preparar([tarefa('a')]);
    await controller.carregar();
    model.excluir.mockRejectedValue(new Error('offline'));

    await controller.excluir('a');

    expect(controller.tarefas().map((item) => item.id)).toEqual(['a']);
    expect(notificador.erro).toHaveBeenCalledWith('Não foi possível excluir a tarefa.');
  });

  it('move a tarefa e salva só as posições alteradas', async () => {
    const { controller, model } = preparar([
      tarefa('a', 'todo', 0),
      tarefa('b', 'todo', 1),
      tarefa('c', 'done', 0),
    ]);
    await controller.carregar();

    await controller.mover('a', 'done', 1);

    expect(controller.colunas()[2].tarefas.map((item) => item.id)).toEqual(['c', 'a']);
    expect(model.salvarPosicoes).toHaveBeenCalledWith([
      { id: 'a', status: 'done', posicao: 1 },
      { id: 'b', status: 'todo', posicao: 0 },
    ]);
  });

  it('não chama o banco quando a tarefa volta para o mesmo lugar', async () => {
    const { controller, model } = preparar([tarefa('a')]);
    await controller.carregar();

    await controller.mover('a', 'todo', 0);

    expect(model.salvarPosicoes).not.toHaveBeenCalled();
  });

  it('desfaz o movimento se o banco recusar', async () => {
    const { controller, model } = preparar([tarefa('a', 'todo', 0)]);
    await controller.carregar();
    model.salvarPosicoes.mockRejectedValue(new Error('offline'));

    await controller.mover('a', 'doing', 0);

    expect(controller.tarefas()[0].status).toBe('todo');
    expect(controller.tarefas()[0].historico).toEqual([]);
  });

  it('registra a entrada na nova coluna na hora e atualiza o relógio', async () => {
    const { controller } = preparar([tarefa('a', 'todo', 0)]);
    await controller.carregar();

    await controller.mover('a', 'doing', 0);

    const [movida] = controller.tarefas();
    expect(movida.historico.map((passagem) => passagem.status)).toEqual(['todo', 'doing']);
    expect(Date.parse(movida.historico[1].desde)).toBe(controller.agora());
  });

  it('conclui a tarefa mandando para o fim de "Concluído"', async () => {
    const { controller, model, notificador } = preparar([
      tarefa('a', 'todo', 0),
      tarefa('c', 'done', 0),
    ]);
    await controller.carregar();

    await controller.concluir('a');

    expect(controller.colunas()[2].tarefas.map((item) => item.id)).toEqual(['c', 'a']);
    expect(model.salvarPosicoes).toHaveBeenCalledWith([{ id: 'a', status: 'done', posicao: 1 }]);
    expect(controller.conquista()).toMatchObject({ tipo: 'tarefa', titulo: 'a' });
    expect(notificador.sucesso).not.toHaveBeenCalled();
  });

  it('não comemora se não conseguir concluir', async () => {
    const { controller, model } = preparar([tarefa('a')]);
    await controller.carregar();
    model.salvarPosicoes.mockRejectedValue(new Error('offline'));

    await controller.concluir('a');

    expect(controller.conquista()).toBeNull();
    expect(controller.tarefas()[0].status).toBe('todo');
  });

  it('comemora ao arrastar para "Concluído", mas não ao mover para outra coluna', async () => {
    const { controller } = preparar([tarefa('a'), tarefa('b')]);
    await controller.carregar();

    await controller.mover('a', 'doing', 0);
    expect(controller.conquista()).toBeNull();

    await controller.mover('a', 'done', 0);
    const primeira = controller.conquista()!;
    expect(primeira.tipo).toBe('tarefa');

    await controller.mover('b', 'done', 1);
    expect(controller.conquista()!.id).not.toBe(primeira.id);

    controller.dispensarConquista();
    expect(controller.conquista()).toBeNull();
  });

  it('comemora o dia 100% uma vez só por dia', async () => {
    const paraHoje = { ...tarefa('a'), prazo: dataHoje() };
    const { controller } = preparar([paraHoje]);
    await controller.carregar();

    await controller.mover('a', 'done', 0);
    expect(controller.conquista()!.tipo).toBe('dia');

    await controller.mover('a', 'todo', 0);
    await controller.mover('a', 'done', 0);
    expect(controller.conquista()!.tipo).toBe('tarefa');
  });

  describe('busca, filtros e resumo', () => {
    const atrasada = { ...tarefa('Atrasada'), prazo: '2000-01-01' };
    const paraHoje = { ...tarefa('Hoje', 'doing'), prazo: dataHoje(), prioridade: 'high' as const };
    const pronta = { ...tarefa('Pronta', 'done'), prazo: '2000-01-01' };

    async function carregado() {
      const contexto = preparar([atrasada, paraHoje, pronta]);
      await contexto.controller.carregar();
      return contexto.controller;
    }

    const visiveis = (controller: TarefaController) =>
      controller.colunas().flatMap((coluna) => coluna.tarefas.map((item) => item.id));

    it('conta as tarefas de cada filtro rápido', async () => {
      const controller = await carregado();

      expect(controller.contagemFiltros()).toEqual({ todas: 3, hoje: 1, atrasadas: 1, alta: 1 });
      expect(controller.progresso()).toEqual({ concluidas: 1, total: 3, percentual: 33 });
    });

    it('mostra só as tarefas do filtro e da busca escolhidos', async () => {
      const controller = await carregado();

      controller.filtro.set('atrasadas');
      expect(visiveis(controller)).toEqual(['Atrasada']);
      expect(controller.filtrando()).toBe(true);

      controller.filtro.set('todas');
      controller.busca.set('pron');
      expect(visiveis(controller)).toEqual(['Pronta']);
    });

    it('limpa busca e filtro de uma vez', async () => {
      const controller = await carregado();
      controller.filtro.set('alta');
      controller.busca.set('x');

      controller.limparFiltros();

      expect(controller.filtrando()).toBe(false);
      expect(visiveis(controller)).toHaveLength(3);
    });
  });
});
