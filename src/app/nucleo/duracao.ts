const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/** Duração curta para a tela: "menos de 1 min", "15 min", "5h 20min", "2d 3h". */
export function formatarDuracao(ms: number): string {
  if (ms < MINUTO) {
    return 'menos de 1 min';
  }
  if (ms < HORA) {
    return `${Math.floor(ms / MINUTO)} min`;
  }
  if (ms < DIA) {
    const horas = Math.floor(ms / HORA);
    const minutos = Math.floor((ms % HORA) / MINUTO);
    return minutos ? `${horas}h ${minutos}min` : `${horas}h`;
  }
  const dias = Math.floor(ms / DIA);
  const horas = Math.floor((ms % DIA) / HORA);
  return horas ? `${dias}d ${horas}h` : `${dias}d`;
}
