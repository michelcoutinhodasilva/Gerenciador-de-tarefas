import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { AutenticacaoController } from '../../controllers/autenticacao.controller';
import { LoginView } from './login.view';

function digitar(elemento: HTMLElement, testId: string, valor: string): void {
  const campo = elemento.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`)!;
  campo.value = valor;
  campo.dispatchEvent(new Event('input'));
}

async function preparar(modo?: string) {
  const autenticacao = {
    erro: signal<string | null>(null),
    carregando: signal(false),
    recuperacaoEnviada: signal(false),
    entrar: vi.fn(),
    cadastrar: vi.fn(),
    enviarRecuperacao: vi.fn(),
    redefinirSenha: vi.fn(),
    limparMensagens: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: AutenticacaoController, useValue: autenticacao },
      { provide: ActivatedRoute, useValue: { snapshot: { data: modo ? { modo } : {} } } },
    ],
  });
  const fixture = TestBed.createComponent(LoginView);
  await fixture.whenStable();
  const elemento = fixture.nativeElement as HTMLElement;
  const enviar = () => elemento.querySelector('form')!.dispatchEvent(new Event('submit'));
  const clicar = (testId: string) =>
    elemento.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)!.click();
  return { fixture, elemento, autenticacao, enviar, clicar };
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
    const { fixture, elemento, autenticacao, enviar, clicar } = await preparar();

    clicar('alternar-modo');
    await fixture.whenStable();
    enviar();

    expect(autenticacao.limparMensagens).toHaveBeenCalled();
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

  it('pede o e-mail na recuperação, sem campo de senha', async () => {
    const { fixture, elemento, autenticacao, enviar, clicar } = await preparar();

    clicar('ir-recuperar');
    await fixture.whenStable();
    expect(elemento.querySelector('[data-testid="senha"]')).toBeNull();

    digitar(elemento, 'email', 'ana@empresa.com');
    enviar();

    expect(autenticacao.enviarRecuperacao).toHaveBeenCalledWith('ana@empresa.com');
  });

  it('mostra o aviso depois de pedir o link', async () => {
    const { fixture, elemento, autenticacao, clicar } = await preparar();

    clicar('ir-recuperar');
    autenticacao.recuperacaoEnviada.set(true);
    await fixture.whenStable();

    expect(elemento.querySelector('[data-testid="aviso"]')).not.toBeNull();
  });

  it('na tela de nova senha, pede senha e confirmação e envia as duas', async () => {
    const { elemento, autenticacao, enviar } = await preparar('redefinir');

    expect(elemento.querySelector('[data-testid="email"]')).toBeNull();
    digitar(elemento, 'senha', 'nova123');
    digitar(elemento, 'confirmacao', 'nova123');
    enviar();

    expect(autenticacao.redefinirSenha).toHaveBeenCalledWith('nova123', 'nova123');
  });
});
