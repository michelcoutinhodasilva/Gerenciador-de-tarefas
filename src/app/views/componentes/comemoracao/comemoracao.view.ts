import { Component, computed, effect, input, output } from '@angular/core';
import { Conquista } from '../../../controllers/tarefa.controller';
import { TipoConquista } from '../../../models/entidades/tarefa';

/** Quanto tempo (ms) cada comemoração fica na tela antes de sumir sozinha. */
export const DURACAO_COMEMORACAO: Readonly<Record<TipoConquista, number>> = {
  tarefa: 2600,
  dia: 6000,
};

/** Confetes espalhados em círculo; a cor vem do CSS (.confete:nth-child). */
function confetes(quantidade: number, alcance: number) {
  return Array.from({ length: quantidade }, (_, indice) => ({
    angulo: `${(360 / quantidade) * indice}deg`,
    distancia: `${alcance + (indice % 3) * 18}px`,
    atraso: `${(indice % 4) * 40}ms`,
  }));
}

const CONFETES: Readonly<Record<TipoConquista, ReturnType<typeof confetes>>> = {
  tarefa: confetes(14, 70),
  dia: confetes(32, 150),
};

/** View: comemoração ao concluir uma tarefa ou fechar o dia em 100%. */
@Component({
  selector: 'app-comemoracao',
  templateUrl: './comemoracao.view.html',
  host: { '(document:keydown.escape)': 'fecharSeAberta()' },
})
export class ComemoracaoView {
  readonly conquista = input<Conquista | null>(null);
  readonly fechar = output<void>();

  /** Lista de no máximo 1 item: o `track` pelo id recria o bloco e reinicia a animação. */
  protected readonly atual = computed(() => {
    const conquista = this.conquista();
    return conquista ? [{ ...conquista, confetes: CONFETES[conquista.tipo] }] : [];
  });

  constructor() {
    effect((aoLimpar) => {
      const conquista = this.conquista();
      if (!conquista) {
        return;
      }
      const relogio = setTimeout(() => this.fechar.emit(), DURACAO_COMEMORACAO[conquista.tipo]);
      aoLimpar(() => clearTimeout(relogio));
    });
  }

  protected fecharSeAberta(): void {
    if (this.conquista()) {
      this.fechar.emit();
    }
  }
}
