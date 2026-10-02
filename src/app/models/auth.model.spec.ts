import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { AuthModel } from './auth.model';
import { ValidationError } from './entities/validation-error';

const supabaseUser = { id: 'u1', email: 'ana@empresa.com' };
const credentials = { email: 'ana@empresa.com', password: '123456' };

function setup() {
  const auth = {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  };
  TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: { auth } }] });
  return { model: TestBed.inject(AuthModel), auth };
}

describe('AuthModel', () => {
  it('retorna o usuário da sessão atual', async () => {
    const { model, auth } = setup();
    auth.getSession.mockResolvedValue({ data: { session: { user: supabaseUser } }, error: null });

    expect(await model.currentUser()).toEqual({ id: 'u1', email: 'ana@empresa.com' });
  });

  it('retorna null sem sessão', async () => {
    const { model, auth } = setup();
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    expect(await model.currentUser()).toBeNull();
  });

  it('faz login com o e-mail normalizado', async () => {
    const { model, auth } = setup();
    auth.signInWithPassword.mockResolvedValue({ data: { user: supabaseUser }, error: null });

    await model.signIn({ email: ' ANA@empresa.com', password: '123456' });

    expect(auth.signInWithPassword).toHaveBeenCalledWith(credentials);
  });

  it('não chama o Supabase com e-mail inválido', async () => {
    const { model, auth } = setup();

    await expect(model.signIn({ email: 'ana', password: '123456' })).rejects.toThrow(
      ValidationError,
    );
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('traduz senha incorreta para uma mensagem amigável', async () => {
    const { model, auth } = setup();
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    });

    await expect(model.signIn(credentials)).rejects.toThrow('E-mail ou senha incorretos.');
  });

  it('cadastro sem sessão indica que falta confirmar o e-mail', async () => {
    const { model, auth } = setup();
    auth.signUp.mockResolvedValue({ data: { user: supabaseUser, session: null }, error: null });

    expect(await model.signUp(credentials)).toBeNull();
  });
});
