import { formatarDuracao } from './duracao';

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

describe('formatarDuracao', () => {
  it('mostra "menos de 1 min" para tempos curtos (ou relógio adiantado)', () => {
    expect(formatarDuracao(30_000)).toBe('menos de 1 min');
    expect(formatarDuracao(-5_000)).toBe('menos de 1 min');
  });

  it('mostra minutos, horas e dias', () => {
    expect(formatarDuracao(15 * MINUTO)).toBe('15 min');
    expect(formatarDuracao(5 * HORA)).toBe('5h');
    expect(formatarDuracao(5 * HORA + 20 * MINUTO)).toBe('5h 20min');
    expect(formatarDuracao(2 * DIA)).toBe('2d');
    expect(formatarDuracao(2 * DIA + 3 * HORA + 40 * MINUTO)).toBe('2d 3h');
  });
});
