import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Notifier } from '../core/notifier';
import { AuthModel } from '../models/auth.model';
import { ValidationError } from '../models/entities/validation-error';
import { AuthController } from './auth.controller';

const user = { id: 'u1', email: 'ana@empresa.com' };
const credentials = { email: 'ana@empresa.com', password: '123456' };

function setup() {
  const model = {
    currentUser: vi.fn().mockResolvedValue(null),
    signIn: vi.fn().mockResolvedValue(user),
    signUp: vi.fn().mockResolvedValue(user),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
  const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
  const notifier = { success: vi.fn(), error: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthModel, useValue: model },
      { provide: Router, useValue: router },
      { provide: Notifier, useValue: notifier },
    ],
  });
  return { controller: TestBed.inject(AuthController), model, router, notifier };
}

describe('AuthController', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));

  it('consulta a sessão só uma vez', async () => {
    const { controller, model } = setup();
    model.currentUser.mockResolvedValue(user);

    expect(await controller.isAuthenticated()).toBe(true);
    expect(await controller.isAuthenticated()).toBe(true);
    expect(model.currentUser).toHaveBeenCalledTimes(1);
  });

  it('considera deslogado se a sessão falhar', async () => {
    const { controller, model } = setup();
    model.currentUser.mockRejectedValue(new Error('offline'));

    expect(await controller.isAuthenticated()).toBe(false);
  });

  it('faz login e abre o quadro', async () => {
    const { controller, router } = setup();

    await controller.signIn(credentials);

    expect(controller.user()).toEqual(user);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/board');
    expect(controller.loading()).toBe(false);
  });

  it('mostra o erro do login e continua na tela', async () => {
    const { controller, model, router } = setup();
    model.signIn.mockRejectedValue(new ValidationError('E-mail ou senha incorretos.'));

    await controller.signIn(credentials);

    expect(controller.error()).toBe('E-mail ou senha incorretos.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('esconde detalhes de erros técnicos', async () => {
    const { controller, model } = setup();
    model.signIn.mockRejectedValue(new Error('fetch failed'));

    await controller.signIn(credentials);

    expect(controller.error()).toBe('Não foi possível entrar. Tente novamente.');
  });

  it('avisa para confirmar o e-mail quando o cadastro exige', async () => {
    const { controller, model, router, notifier } = setup();
    model.signUp.mockResolvedValue(null);

    await controller.signUp(credentials);

    expect(notifier.success).toHaveBeenCalledWith('Conta criada! Confirme seu e-mail para entrar.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('sai e volta para o login', async () => {
    const { controller, router } = setup();
    await controller.signIn(credentials);

    await controller.signOut();

    expect(controller.user()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/login');
  });
});
