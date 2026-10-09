import { ErroValidacao } from '../models/entidades/erro-validacao';

/** Mostra a mensagem de regra de negócio; erros técnicos viram `padrao` (e vão para o console). */
export function mensagemErro(erro: unknown, padrao: string): string {
  if (erro instanceof ErroValidacao) {
    return erro.message;
  }
  console.error(erro);
  return padrao;
}
