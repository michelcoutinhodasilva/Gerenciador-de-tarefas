import { Routes } from '@angular/router';
import { guardaLogado, guardaVisitante } from './nucleo/autenticacao.guard';

export const rotas: Routes = [
  {
    path: 'login',
    title: 'Entrar · Gerenciador de Tarefas',
    canActivate: [guardaVisitante],
    loadComponent: () => import('./views/login/login.view').then((m) => m.LoginView),
  },
  {
    path: 'quadro',
    title: 'Quadro · Gerenciador de Tarefas',
    canActivate: [guardaLogado],
    loadComponent: () => import('./views/quadro/quadro.view').then((m) => m.QuadroView),
  },
  { path: '', pathMatch: 'full', redirectTo: 'quadro' },
  { path: '**', redirectTo: 'quadro' },
];
