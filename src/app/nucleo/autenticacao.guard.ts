import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacaoController } from '../controllers/autenticacao.controller';

/** Só deixa entrar no quadro quem fez login. */
export const guardaLogado: CanActivateFn = async () => {
  const autenticacao = inject(AutenticacaoController);
  const router = inject(Router);
  return (await autenticacao.estaAutenticado()) || router.createUrlTree(['/login']);
};

/** Quem já fez login não precisa ver a tela de login. */
export const guardaVisitante: CanActivateFn = async () => {
  const autenticacao = inject(AutenticacaoController);
  const router = inject(Router);
  return !(await autenticacao.estaAutenticado()) || router.createUrlTree(['/quadro']);
};
