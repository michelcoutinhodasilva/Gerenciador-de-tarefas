import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthController } from '../../controllers/auth.controller';
import { LoginView } from './login.view';

function type(element: HTMLElement, testId: string, value: string): void {
  const input = element.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

async function setup() {
  const auth = {
    error: signal<string | null>(null),
    loading: signal(false),
    signIn: vi.fn(),
    signUp: vi.fn(),
    clearError: vi.fn(),
  };
  TestBed.configureTestingModule({ providers: [{ provide: AuthController, useValue: auth }] });
  const fixture = TestBed.createComponent(LoginView);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const submit = () => element.querySelector('form')!.dispatchEvent(new Event('submit'));
  return { fixture, element, auth, submit };
}

describe('LoginView', () => {
  it('envia e-mail e senha para o controller ao entrar', async () => {
    const { element, auth, submit } = await setup();

    type(element, 'email', 'ana@empresa.com');
    type(element, 'password', '123456');
    submit();

    expect(auth.signIn).toHaveBeenCalledWith({ email: 'ana@empresa.com', password: '123456' });
  });

  it('usa o cadastro depois de trocar o modo', async () => {
    const { fixture, element, auth, submit } = await setup();

    element.querySelector<HTMLButtonElement>('[data-testid="toggle-mode"]')!.click();
    await fixture.whenStable();
    submit();

    expect(auth.clearError).toHaveBeenCalled();
    expect(auth.signUp).toHaveBeenCalled();
    expect(element.querySelector('h1')?.textContent).toContain('Crie sua conta');
  });

  it('mostra o erro vindo do controller', async () => {
    const { fixture, element, auth } = await setup();

    auth.error.set('E-mail ou senha incorretos.');
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="error"]')?.textContent).toContain(
      'E-mail ou senha incorretos.',
    );
  });
});
