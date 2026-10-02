import { ValidationError } from '../models/entities/validation-error';

/** Mostra a mensagem de regra de negócio; erros técnicos viram `fallback` (e vão para o console). */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ValidationError) {
    return error.message;
  }
  console.error(error);
  return fallback;
}
