import { ErroValidacao } from './erro-validacao';

export const SENHA_TAMANHO_MINIMO = 6;

const PADRAO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Credenciais {
  email: string;
  senha: string;
}

export interface UsuarioApp {
  id: string;
  email: string;
}

export function validarCredenciais(credenciais: Credenciais): Credenciais {
  const email = credenciais.email.trim().toLowerCase();

  if (!PADRAO_EMAIL.test(email)) {
    throw new ErroValidacao('Informe um e-mail válido.');
  }
  if (credenciais.senha.length < SENHA_TAMANHO_MINIMO) {
    throw new ErroValidacao(`A senha deve ter pelo menos ${SENHA_TAMANHO_MINIMO} caracteres.`);
  }
  return { email, senha: credenciais.senha };
}
