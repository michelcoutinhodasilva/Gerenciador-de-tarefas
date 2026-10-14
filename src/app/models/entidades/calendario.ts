import { dataHoje, entradaNaColuna, Tarefa } from './tarefa';

/** Um quadradinho do calendário. */
export interface DiaCalendario {
  /** AAAA-MM-DD */
  data: string;
  numero: number;
  /** `false` para os dias do mês anterior/seguinte que completam as semanas. */
  doMes: boolean;
  criadas: number;
  entregues: number;
}

export interface TarefasDoDia {
  criadas: Tarefa[];
  entregues: Tarefa[];
}

/** Dia local (AAAA-MM-DD) de uma data e hora ISO. */
export function diaLocal(iso: string): string {
  return dataHoje(new Date(iso));
}

/** Dia em que a tarefa foi entregue (entrou em "Concluído" pela última vez); `null` se não está concluída. */
export function diaEntrega(tarefa: Tarefa): string | null {
  return tarefa.status === 'done' ? diaLocal(entradaNaColuna(tarefa)) : null;
}

/** Mês (AAAA-MM) de uma data AAAA-MM-DD. */
export function mesDe(data: string): string {
  return data.slice(0, 7);
}

/** Avança (`delta` > 0) ou volta meses: mudarMes('2026-01', -1) → '2025-12'. */
export function mudarMes(mes: string, delta: number): string {
  const [ano, numero] = mes.split('-').map(Number);
  return mesDe(dataHoje(new Date(ano, numero - 1 + delta, 1)));
}

/** Semanas completas (domingo a sábado) que cobrem o mês, com a contagem de cada dia. */
export function gradeDoMes(mes: string, tarefas: readonly Tarefa[]): DiaCalendario[] {
  const criadas = contarPorDia(tarefas.map((tarefa) => diaLocal(tarefa.criadaEm)));
  const entregues = contarPorDia(tarefas.map(diaEntrega));

  const [ano, numero] = mes.split('-').map(Number);
  const primeiro = new Date(ano, numero - 1, 1);
  const diasNoMes = new Date(ano, numero, 0).getDate();
  const semanas = Math.ceil((primeiro.getDay() + diasNoMes) / 7);

  return Array.from({ length: semanas * 7 }, (_, indice) => {
    const dia = new Date(ano, numero - 1, 1 - primeiro.getDay() + indice);
    const data = dataHoje(dia);
    return {
      data,
      numero: dia.getDate(),
      doMes: mesDe(data) === mes,
      criadas: criadas.get(data) ?? 0,
      entregues: entregues.get(data) ?? 0,
    };
  });
}

/** Tarefas criadas e entregues no dia (AAAA-MM-DD), das mais antigas para as mais novas. */
export function tarefasDoDia(tarefas: readonly Tarefa[], dia: string): TarefasDoDia {
  return {
    criadas: tarefas
      .filter((tarefa) => diaLocal(tarefa.criadaEm) === dia)
      .sort((a, b) => a.criadaEm.localeCompare(b.criadaEm)),
    entregues: tarefas
      .filter((tarefa) => diaEntrega(tarefa) === dia)
      .sort((a, b) => entradaNaColuna(a).localeCompare(entradaNaColuna(b))),
  };
}

function contarPorDia(dias: readonly (string | null)[]): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const dia of dias) {
    if (dia) {
      contagem.set(dia, (contagem.get(dia) ?? 0) + 1);
    }
  }
  return contagem;
}
