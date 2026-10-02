/** Erro de regra de negócio: a mensagem é segura para mostrar ao usuário. */
export class ValidationError extends Error {
  override readonly name = 'ValidationError';
}
