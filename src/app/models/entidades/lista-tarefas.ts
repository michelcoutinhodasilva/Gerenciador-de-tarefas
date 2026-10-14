import { DadosTarefa, LIMITES_TAREFA } from './tarefa';

/** Tarefa reconhecida num texto colado (prioridade e prazo vêm da janela). */
export type ItemLista = Pick<DadosTarefa, 'titulo' | 'descricao'>;

/** Começo de item: "Tarefa 1 -", "arefa 10 -", "1.", "1)", "-", "•", "*". */
const MARCADOR = /^(?:t?arefa\s*\d+\s*[-–—.:)]?\s*|(?:\d+\s*[-–—.:)]|[-–—•*])\s+)/i;

interface Rascunho {
  titulo: string;
  extras: string[];
}

/**
 * Separa um texto colado em tarefas.
 * Com itens numerados, linha sem numeração vira descrição do item anterior.
 * Sem numeração nenhuma, cada linha é uma tarefa.
 */
export function separarLista(texto: string): ItemLista[] {
  const linhas = linhasDe(texto);
  const numerada = linhas.some((linha) => MARCADOR.test(linha));
  const rascunhos: Rascunho[] = [];

  for (const linha of linhas) {
    const atual = rascunhos.at(-1);
    if (numerada && atual && !MARCADOR.test(linha)) {
      if (atual.titulo) {
        atual.extras.push(linha);
      } else {
        atual.titulo = linha;
      }
      continue;
    }
    rascunhos.push({ titulo: linha.replace(MARCADOR, '').trim(), extras: [] });
  }

  return rascunhos.filter((rascunho) => rascunho.titulo).map(montarItem);
}

/** O texto inteiro como uma tarefa só: 1ª linha no título, o resto na descrição. */
export function comoUmaTarefa(texto: string): ItemLista {
  const [titulo = '', ...extras] = linhasDe(texto);
  return montarItem({ titulo, extras });
}

function linhasDe(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);
}

/** Título longo é cortado; o texto inteiro vai para o início da descrição. */
function montarItem({ titulo, extras }: Rascunho): ItemLista {
  const cortado = cortarTitulo(titulo);
  const descricao = [cortado === titulo ? '' : titulo, ...extras].filter(Boolean).join('\n');
  return { titulo: cortado, descricao };
}

function cortarTitulo(titulo: string): string {
  if (titulo.length <= LIMITES_TAREFA.tituloMax) {
    return titulo;
  }
  const corte = titulo.slice(0, LIMITES_TAREFA.tituloMax - 1);
  const espaco = corte.lastIndexOf(' ');
  return `${(espaco > 0 ? corte.slice(0, espaco) : corte).trimEnd()}…`;
}
