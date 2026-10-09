import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AutenticacaoController } from '../controllers/autenticacao.controller';
import { guardaLogado, guardaVisitante } from './autenticacao.guard';

function executarGuarda(guarda: typeof guardaLogado, autenticado: boolean) {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AutenticacaoController,
        useValue: { estaAutenticado: async () => autenticado },
      },
    ],
  });
  return TestBed.runInInjectionContext(() =>
    guarda({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as Promise<boolean | UrlTree>;
}

const url = (resultado: boolean | UrlTree) =>
  TestBed.inject(Router).serializeUrl(resultado as UrlTree);

describe('Guardas de rota', () => {
  it('guardaLogado libera quem está logado', async () => {
    expect(await executarGuarda(guardaLogado, true)).toBe(true);
  });

  it('guardaLogado manda para o login quem não está logado', async () => {
    expect(url(await executarGuarda(guardaLogado, false))).toBe('/login');
  });

  it('guardaVisitante manda para o quadro quem já está logado', async () => {
    expect(url(await executarGuarda(guardaVisitante, true))).toBe('/quadro');
  });
});
