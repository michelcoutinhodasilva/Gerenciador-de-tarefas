import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthController } from '../controllers/auth.controller';

/** Só deixa entrar no quadro quem fez login. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthController);
  const router = inject(Router);
  return (await auth.isAuthenticated()) || router.createUrlTree(['/login']);
};

/** Quem já fez login não precisa ver a tela de login. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthController);
  const router = inject(Router);
  return !(await auth.isAuthenticated()) || router.createUrlTree(['/board']);
};
