import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, ConfirmDialog],
  template: `
    <router-outlet />
    <p-toast position="bottom-right" />
    <p-confirmdialog [style]="{ width: '26rem', maxWidth: 'calc(100vw - 2rem)' }" />
  `,
})
export class App {}
