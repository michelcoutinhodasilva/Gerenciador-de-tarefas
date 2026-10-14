import { comoUmaTarefa, separarLista } from './lista-tarefas';
import { LIMITES_TAREFA } from './tarefa';

/** Lista real colada pelo usuário (com o erro de digitação "arefa 10"). */
const LISTA = `Tarefa 1 - Retirar “Motivo” em Abatimentos + criar filtro Representante
Tarefa 2 - Permitir editar número RMA, tipo (Garantia/Devolução) em processo aberto
Tarefa 3 - Retirar aba “Tarefas” dentro de processo
Tarefa 4 - Filtros: Vendedores, Representantes, Fornecedores, Código Interno, Origem, Tipo
Campos busca: Cliente, Fornecedor, NF, Código da peça RMA: ordem crescente [ANALISAR]
Tarefa 5 - Revisar “Sem vínculo de cadastro” - remover se necessário - (Quando voces criam o processo de garantia colocam o nome da empresa porem não pegam o vinculo dessa empresa)
Tarefa 6 - Campo para Compras: calcular processos parados com fornecedor
(NF Envio preenchida + NF Devolutiva vazia)
Tarefa 7 - Guia compartilhada Compras/Garantias: crédito fornecedor + notificações
Tarefa 8 - Corrigir bug das opções fornecedores
Tarefa 9 - Permitir buscar fornecedor por nome em processos
arefa 10 - Padronizar nome fornecedores (CAPS ou normal?)
Tarefa 11 - Consolidar em um único botão “Salvar” para todos os campos (NF da Venda, NF de Compra, NF Recebido Cliente, NF Envio Fornecedor, NF Devolutiva Fornecedor, NF Devolvedor Cliente, NF entre Empresas)
Tarefa 12 - Criar botão para duplicar processo de garantia como devolução (copia informações + gera novo RMA com sufixo “B”, ex: RMA 1000 → RMA 1000 B)`;

describe('separarLista', () => {
  const itens = separarLista(LISTA);

  it('separa a lista do usuário em 12 tarefas, sem o prefixo "Tarefa N -"', () => {
    expect(itens).toHaveLength(12);
    expect(itens[0]).toEqual({
      titulo: 'Retirar “Motivo” em Abatimentos + criar filtro Representante',
      descricao: '',
    });
    expect(itens[9].titulo).toBe('Padronizar nome fornecedores (CAPS ou normal?)');
  });

  it('linha sem numeração vira descrição da tarefa anterior', () => {
    expect(itens[3].descricao).toBe(
      'Campos busca: Cliente, Fornecedor, NF, Código da peça RMA: ordem crescente [ANALISAR]',
    );
    expect(itens[5].descricao).toBe('(NF Envio preenchida + NF Devolutiva vazia)');
  });

  it('corta título longo numa palavra e guarda o texto inteiro na descrição', () => {
    const longa = itens[10];
    expect(longa.titulo.length).toBeLessThanOrEqual(LIMITES_TAREFA.tituloMax);
    expect(longa.titulo).toMatch(/^Consolidar em um único botão .*\S…$/);
    expect(longa.descricao).toContain('NF entre Empresas)');
    expect(itens.every((item) => item.titulo.length <= LIMITES_TAREFA.tituloMax)).toBe(true);
  });

  it('sem numeração, cada linha é uma tarefa', () => {
    expect(separarLista('Comprar pão\n\n  Ligar para o João  \r\nPagar conta')).toEqual([
      { titulo: 'Comprar pão', descricao: '' },
      { titulo: 'Ligar para o João', descricao: '' },
      { titulo: 'Pagar conta', descricao: '' },
    ]);
  });

  it('aceita "1.", "2)", "-" e "•" como começo de item', () => {
    const titulos = separarLista('1. Um\n2) Dois\n- Três\n• Quatro').map((item) => item.titulo);
    expect(titulos).toEqual(['Um', 'Dois', 'Três', 'Quatro']);
  });

  it('item numerado sem texto usa a linha seguinte como título', () => {
    expect(separarLista('Tarefa 1 -\nRevisar contrato\nTarefa 2 - Enviar')).toEqual([
      { titulo: 'Revisar contrato', descricao: '' },
      { titulo: 'Enviar', descricao: '' },
    ]);
  });

  it('texto de uma linha só gera uma tarefa', () => {
    expect(separarLista('Revisar proposta')).toHaveLength(1);
  });
});

describe('comoUmaTarefa', () => {
  it('usa a primeira linha como título e o resto como descrição', () => {
    expect(comoUmaTarefa('Reunião\nPauta: metas\nLevar notebook')).toEqual({
      titulo: 'Reunião',
      descricao: 'Pauta: metas\nLevar notebook',
    });
  });
});
