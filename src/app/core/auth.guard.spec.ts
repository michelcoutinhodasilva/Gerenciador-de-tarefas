import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthController } from '../controllers/auth.controller';
import { authGuard, guestGuard } from './auth.guard';

function runGuard(guard: typeof authGuard, authenticated: boolean) {
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthController, useValue: { isAuthenticated: async () => authenticated } },
    ],
  });
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as Promise<boolean | UrlTree>;
}

const url = (result: boolean | UrlTree) => TestBed.inject(Router).serializeUrl(result as UrlTree);

describe('Guards de rota', () => {
  it('authGuard libera quem está logado', async () => {
    expect(await runGuard(authGuard, true)).toBe(true);
  });

  it('authGuard manda para o login quem não está logado', async () => {
    expect(url(await runGuard(authGuard, false))).toBe('/login');
  });

  it('guestGuard manda para o quadro quem já está logado', async () => {
    expect(url(await runGuard(guestGuard, true))).toBe('/board');
  });
});
