import { ErroValidacao } from './erro-validacao';

const PADRAO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Credenciais {
  email: string;
  senha: string;
}

export interface UsuarioApp {
  id: string;
  email: string;
}

export function validarEmail(email: string): string {
  const normalizado = email.trim().toLowerCase();
  if (!PADRAO_EMAIL.test(normalizado)) {
    throw new ErroValidacao('Informe um e-mail válido.');
  }
  return normalizado;
}

export function validarSenha(senha: string): string {
  if (!senha) {
    throw new ErroValidacao('Informe uma senha.');
  }
  return senha;
}

export function validarCredenciais(credenciais: Credenciais): Credenciais {
  return { email: validarEmail(credenciais.email), senha: validarSenha(credenciais.senha) };
}
