import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENTE } from '../nucleo/supabase.cliente';
import { AutenticacaoModel } from './autenticacao.model';
import { ErroValidacao } from './entidades/erro-validacao';

const usuarioSupabase = { id: 'u1', email: 'ana@empresa.com' };
const credenciais = { email: 'ana@empresa.com', senha: '123456' };
/** Formato que o Supabase recebe (campos em inglês). */
const credenciaisSupabase = { email: 'ana@empresa.com', password: '123456' };

function preparar() {
  const auth = {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENTE, useValue: { auth } }],
  });
  return { model: TestBed.inject(AutenticacaoModel), auth };
}

describe('AutenticacaoModel', () => {
  it('retorna o usuário da sessão atual', async () => {
    const { model, auth } = preparar();
    auth.getSession.mockResolvedValue({
      data: { session: { user: usuarioSupabase } },
      error: null,
    });

    expect(await model.usuarioAtual()).toEqual({ id: 'u1', email: 'ana@empresa.com' });
  });

  it('retorna null sem sessão', async () => {
    const { model, auth } = preparar();
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    expect(await model.usuarioAtual()).toBeNull();
  });

  it('faz login com o e-mail normalizado', async () => {
    const { model, auth } = preparar();
    auth.signInWithPassword.mockResolvedValue({ data: { user: usuarioSupabase }, error: null });

    await model.entrar({ email: ' ANA@empresa.com', senha: '123456' });

    expect(auth.signInWithPassword).toHaveBeenCalledWith(credenciaisSupabase);
  });

  it('não chama o Supabase com e-mail inválido', async () => {
    const { model, auth } = preparar();

    await expect(model.entrar({ email: 'ana', senha: '123456' })).rejects.toThrow(ErroValidacao);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('traduz senha incorreta para uma mensagem amigável', async () => {
    const { model, auth } = preparar();
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    });

    await expect(model.entrar(credenciais)).rejects.toThrow('E-mail ou senha incorretos.');
  });

  it('cadastra enviando os campos no formato do Supabase', async () => {
    const { model, auth } = preparar();
    auth.signUp.mockResolvedValue({ data: { user: usuarioSupabase, session: {} }, error: null });

    expect(await model.cadastrar(credenciais)).toEqual({ id: 'u1', email: 'ana@empresa.com' });
    expect(auth.signUp).toHaveBeenCalledWith(credenciaisSupabase);
  });

  it('cadastro sem sessão indica que falta confirmar o e-mail', async () => {
    const { model, auth } = preparar();
    auth.signUp.mockResolvedValue({ data: { user: usuarioSupabase, session: null }, error: null });

    expect(await model.cadastrar(credenciais)).toBeNull();
  });
});
