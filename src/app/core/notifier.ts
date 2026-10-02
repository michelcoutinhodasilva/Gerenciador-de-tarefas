import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

/** Avisos rápidos (toasts) exibidos no canto da tela. */
@Injectable({ providedIn: 'root' })
export class Notifier {
  private readonly messages = inject(MessageService);

  success(detail: string): void {
    this.messages.add({ severity: 'success', summary: 'Pronto', detail, life: 2500 });
  }

  error(detail: string): void {
    this.messages.add({ severity: 'error', summary: 'Algo deu errado', detail, life: 5000 });
  }
}
