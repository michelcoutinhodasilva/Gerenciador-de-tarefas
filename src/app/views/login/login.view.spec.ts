import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutenticacaoController } from '../../controllers/autenticacao.controller';
import { LoginView } from './login.view';

function digitar(elemento: HTMLElement, testId: string, valor: string): void {
  const campo = elemento.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`)!;
  campo.value = valor;
  campo.dispatchEvent(new Event('input'));
}

async function preparar() {
  const autenticacao = {
    erro: signal<string | null>(null),
    carregando: signal(false),
    entrar: vi.fn(),
    cadastrar: vi.fn(),
    limparErro: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [{ provide: AutenticacaoController, useValue: autenticacao }],
  });
  const fixture = TestBed.createComponent(LoginView);
  await fixture.whenStable();
  const elemento = fixture.nativeElement as HTMLElement;
  const enviar = () => elemento.querySelector('form')!.dispatchEvent(new Event('submit'));
  return { fixture, elemento, autenticacao, enviar };
}

describe('LoginView', () => {
  it('envia e-mail e senha para o controller ao entrar', async () => {
    const { elemento, autenticacao, enviar } = await preparar();

    digitar(elemento, 'email', 'ana@empresa.com');
    digitar(elemento, 'senha', '123456');
    enviar();

    expect(autenticacao.entrar).toHaveBeenCalledWith({ email: 'ana@empresa.com', senha: '123456' });
  });

  it('usa o cadastro depois de trocar o modo', async () => {
    const { fixture, elemento, autenticacao, enviar } = await preparar();

    elemento.querySelector<HTMLButtonElement>('[data-testid="alternar-modo"]')!.click();
    await fixture.whenStable();
    enviar();

    expect(autenticacao.limparErro).toHaveBeenCalled();
    expect(autenticacao.cadastrar).toHaveBeenCalled();
    expect(elemento.querySelector('h1')?.textContent).toContain('Crie sua conta');
  });

  it('mostra o erro vindo do controller', async () => {
    const { fixture, elemento, autenticacao } = await preparar();

    autenticacao.erro.set('E-mail ou senha incorretos.');
    await fixture.whenStable();

    expect(elemento.querySelector('[data-testid="erro"]')?.textContent).toContain(
      'E-mail ou senha incorretos.',
    );
  });
});
