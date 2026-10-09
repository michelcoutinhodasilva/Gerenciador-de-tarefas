/** Erro de regra de negócio: a mensagem é segura para mostrar ao usuário. */
export class ErroValidacao extends Error {
  override readonly name = 'ErroValidacao';
}
