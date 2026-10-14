import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENTE } from '../nucleo/supabase.cliente';
import { ErroValidacao } from './entidades/erro-validacao';
import { DadosTarefa } from './entidades/tarefa';
import { TarefaModel } from './tarefa.model';

type Resultado = { data: unknown; error: { message: string } | null };

/** Simula o query builder do Supabase: todo método encadeia e o `await` devolve `resultado`. */
function supabaseFalso(resultado: Resultado) {
  const consulta: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const metodo of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single']) {
    consulta[metodo] = vi.fn(() => consulta);
  }
  Object.assign(consulta, {
    then: (aoConcluir: (valor: Resultado) => unknown, aoFalhar: (motivo: unknown) => unknown) =>
      Promise.resolve(resultado).then(aoConcluir, aoFalhar),
  });
  const banco = { from: vi.fn(() => consulta) };
  return { banco, consulta };
}

/** Linha como vem do banco (colunas em inglês). */
const linha = {
  id: '1',
  title: 'Revisar',
  description: 'detalhes',
  status: 'todo',
  priority: 'high',
  due_date: '2026-10-05',
  position: 0,
  created_at: '2026-10-02T00:00:00Z',
};

const vazio: DadosTarefa = { titulo: '', descricao: '', prioridade: 'medium', prazo: null };

function preparar(resultado: Resultado) {
  const falso = supabaseFalso(resultado);
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENTE, useValue: falso.banco }],
  });
  return { model: TestBed.inject(TarefaModel), ...falso };
}

describe('TarefaModel', () => {
  it('lista as tarefas convertendo os campos do banco', async () => {
    const { model, banco, consulta } = preparar({ data: [linha], error: null });

    const tarefas = await model.listar();

    expect(banco.from).toHaveBeenCalledWith('tasks');
    expect(consulta['order']).toHaveBeenCalledWith('position');
    expect(tarefas).toEqual([
      {
        id: '1',
        titulo: 'Revisar',
        descricao: 'detalhes',
        status: 'todo',
        prioridade: 'high',
        prazo: '2026-10-05',
        posicao: 0,
        criadaEm: '2026-10-02T00:00:00Z',
        historico: [],
      },
    ]);
  });

  it('busca o histórico de colunas junto e ordena do mais antigo ao mais novo', async () => {
    const comHistorico = {
      ...linha,
      status: 'doing',
      task_status_history: [
        { status: 'doing', changed_at: '2026-10-03T10:00:00Z' },
        { status: 'todo', changed_at: '2026-10-02T00:00:00Z' },
      ],
    };
    const { model, consulta } = preparar({ data: [comHistorico], error: null });

    const [tarefa] = await model.listar();

    expect(consulta['select']).toHaveBeenCalledWith(
      expect.stringContaining('task_status_history(status, changed_at)'),
    );
    expect(tarefa.historico).toEqual([
      { status: 'todo', desde: '2026-10-02T00:00:00Z' },
      { status: 'doing', desde: '2026-10-03T10:00:00Z' },
    ]);
  });

  it('cria a tarefa com os dados já validados', async () => {
    const { model, consulta } = preparar({ data: linha, error: null });

    const tarefa = await model.criar(
      { titulo: '  Revisar ', descricao: 'detalhes', prioridade: 'high', prazo: '2026-10-05' },
      'todo',
      3,
    );

    expect(consulta['insert']).toHaveBeenCalledWith({
      title: 'Revisar',
      description: 'detalhes',
      priority: 'high',
      due_date: '2026-10-05',
      status: 'todo',
      position: 3,
    });
    expect(tarefa.id).toBe('1');
  });

  it('não chama o banco quando o título é inválido', async () => {
    const { model, banco } = preparar({ data: linha, error: null });

    await expect(model.criar({ ...vazio, titulo: ' ' }, 'todo', 0)).rejects.toThrow(ErroValidacao);
    expect(banco.from).not.toHaveBeenCalled();
  });

  it('cria várias tarefas numa única gravação, em posições seguidas', async () => {
    const { model, banco, consulta } = preparar({
      data: [
        { ...linha, id: '2', position: 6 },
        { ...linha, id: '1', position: 5 },
      ],
      error: null,
    });

    const tarefas = await model.criarVarias(
      [
        { ...vazio, titulo: ' Um ' },
        { ...vazio, titulo: 'Dois', prioridade: 'high' },
      ],
      'todo',
      5,
    );

    expect(banco.from).toHaveBeenCalledTimes(1);
    expect(consulta['insert']).toHaveBeenCalledWith([
      { title: 'Um', description: '', priority: 'medium', due_date: null, status: 'todo', position: 5 },
      { title: 'Dois', description: '', priority: 'high', due_date: null, status: 'todo', position: 6 },
    ]);
    expect(tarefas.map((tarefa) => tarefa.id)).toEqual(['1', '2']);
  });

  it('diz qual item da lista é inválido e não chama o banco', async () => {
    const { model, banco } = preparar({ data: [], error: null });

    await expect(
      model.criarVarias([{ ...vazio, titulo: 'Ok' }, vazio], 'todo', 0),
    ).rejects.toThrow('Tarefa 2: O título é obrigatório.');
    expect(banco.from).not.toHaveBeenCalled();
  });

  it('atualiza a tarefa pelo id', async () => {
    const { model, consulta } = preparar({ data: linha, error: null });

    await model.atualizar('1', { ...vazio, titulo: 'Revisar' });

    expect(consulta['update']).toHaveBeenCalledWith({
      title: 'Revisar',
      description: '',
      priority: 'medium',
      due_date: null,
    });
    expect(consulta['eq']).toHaveBeenCalledWith('id', '1');
  });

  it('exclui a tarefa pelo id', async () => {
    const { model, consulta } = preparar({ data: null, error: null });

    await model.excluir('1');

    expect(consulta['delete']).toHaveBeenCalled();
    expect(consulta['eq']).toHaveBeenCalledWith('id', '1');
  });

  it('salva cada posição alterada', async () => {
    const { model, consulta } = preparar({ data: null, error: null });

    await model.salvarPosicoes([
      { id: '1', status: 'doing', posicao: 0 },
      { id: '2', status: 'todo', posicao: 1 },
    ]);

    expect(consulta['update']).toHaveBeenCalledWith({ status: 'doing', position: 0 });
    expect(consulta['update']).toHaveBeenCalledWith({ status: 'todo', position: 1 });
  });

  it('repassa o erro do banco', async () => {
    const { model } = preparar({ data: null, error: { message: 'falha no banco' } });

    await expect(model.listar()).rejects.toThrow('falha no banco');
  });
});
