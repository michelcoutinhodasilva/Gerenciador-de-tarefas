import { inject, Injectable } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SUPABASE_CLIENTE } from '../nucleo/supabase.cliente';
import {
  Credenciais,
  UsuarioApp,
  validarCredenciais,
  validarEmail,
  validarSenha,
} from './entidades/credenciais';
import { ErroValidacao } from './entidades/erro-validacao';

/** Rota da tela que recebe o link do e-mail de recuperação. */
const CAMINHO_REDEFINIR_SENHA = '/redefinir-senha';

/** Erros do Supabase Auth que o usuário consegue resolver sozinho. */
const ERROS_AMIGAVEIS: Readonly<Record<string, string>> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
  user_already_exists: 'Este e-mail já está cadastrado.',
  weak_password: 'Senha muito fraca. Use uma senha mais forte.',
};

interface FalhaAuth {
  message: string;
  code?: string;
}

/** Model: login, cadastro e sessão do usuário no Supabase. */
@Injectable({ providedIn: 'root' })
export class AutenticacaoModel {
  private readonly banco = inject(SUPABASE_CLIENTE);

  async usuarioAtual(): Promise<UsuarioApp | null> {
    const { data, error } = await this.banco.auth.getSession();
    lancarSeFalhou(error);
    return paraUsuarioApp(data.session?.user);
  }

  async entrar(credenciais: Credenciais): Promise<UsuarioApp> {
    const { data, error } = await this.banco.auth.signInWithPassword(
      paraSupabase(validarCredenciais(credenciais)),
    );
    lancarSeFalhou(error);
    const usuario = paraUsuarioApp(data.user);
    if (!usuario) {
      throw new Error('Login sem usuário retornado.');
    }
    return usuario;
  }

  /** Retorna `null` quando o Supabase exige confirmação por e-mail antes do login. */
  async cadastrar(credenciais: Credenciais): Promise<UsuarioApp | null> {
    const { data, error } = await this.banco.auth.signUp(
      paraSupabase(validarCredenciais(credenciais)),
    );
    lancarSeFalhou(error);
    return data.session ? paraUsuarioApp(data.user) : null;
  }

  /** Envia o e-mail com o link para criar uma senha nova. */
  async enviarRecuperacao(email: string): Promise<void> {
    const { error } = await this.banco.auth.resetPasswordForEmail(validarEmail(email), {
      redirectTo: window.location.origin + CAMINHO_REDEFINIR_SENHA,
    });
    lancarSeFalhou(error);
  }

  /** Troca a senha de quem abriu o link de recuperação (sessão temporária do Supabase). */
  async redefinirSenha(senha: string): Promise<UsuarioApp> {
    const { data, error } = await this.banco.auth.updateUser({ password: validarSenha(senha) });
    lancarSeFalhou(error);
    const usuario = paraUsuarioApp(data.user);
    if (!usuario) {
      throw new Error('Troca de senha sem usuário retornado.');
    }
    return usuario;
  }

  async sair(): Promise<void> {
    const { error } = await this.banco.auth.signOut();
    lancarSeFalhou(error);
  }
}

function lancarSeFalhou(erro: FalhaAuth | null): void {
  if (!erro) {
    return;
  }
  const amigavel = erro.code ? ERROS_AMIGAVEIS[erro.code] : undefined;
  throw amigavel ? new ErroValidacao(amigavel) : new Error(erro.message);
}

/** O Supabase espera os campos em inglês. */
function paraSupabase({ email, senha }: Credenciais) {
  return { email, password: senha };
}

function paraUsuarioApp(usuario: User | null | undefined): UsuarioApp | null {
  return usuario ? { id: usuario.id, email: usuario.email ?? '' } : null;
}
