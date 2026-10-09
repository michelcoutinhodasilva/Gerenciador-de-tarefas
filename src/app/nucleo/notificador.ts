import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

/** Avisos rápidos (toasts) exibidos no canto da tela. */
@Injectable({ providedIn: 'root' })
export class Notificador {
  private readonly mensagens = inject(MessageService);

  sucesso(detalhe: string): void {
    this.mensagens.add({ severity: 'success', summary: 'Pronto', detail: detalhe, life: 2500 });
  }

  erro(detalhe: string): void {
    this.mensagens.add({
      severity: 'error',
      summary: 'Algo deu errado',
      detail: detalhe,
      life: 5000,
    });
  }
}
