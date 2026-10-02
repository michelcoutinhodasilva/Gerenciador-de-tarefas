import { ValidationError } from './validation-error';

export const PASSWORD_MIN_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Credentials {
  email: string;
  password: string;
}

export interface AppUser {
  id: string;
  email: string;
}

export function validateCredentials(credentials: Credentials): Credentials {
  const email = credentials.email.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    throw new ValidationError('Informe um e-mail válido.');
  }
  if (credentials.password.length < PASSWORD_MIN_LENGTH) {
    throw new ValidationError(`A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`);
  }
  return { email, password: credentials.password };
}
