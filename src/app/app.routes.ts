import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Entrar · Gerenciador de Tarefas',
    canActivate: [guestGuard],
    loadComponent: () => import('./views/login/login.view').then((m) => m.LoginView),
  },
  {
    path: 'board',
    title: 'Quadro · Gerenciador de Tarefas',
    canActivate: [authGuard],
    loadComponent: () => import('./views/board/board.view').then((m) => m.BoardView),
  },
  { path: '', pathMatch: 'full', redirectTo: 'board' },
  { path: '**', redirectTo: 'board' },
];
