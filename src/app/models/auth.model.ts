import { inject, Injectable } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../core/supabase.client';
import { AppUser, Credentials, validateCredentials } from './entities/credentials';
import { ValidationError } from './entities/validation-error';

/** Erros do Supabase Auth que o usuário consegue resolver sozinho. */
const FRIENDLY_AUTH_ERRORS: Readonly<Record<string, string>> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
  user_already_exists: 'Este e-mail já está cadastrado.',
  weak_password: 'Senha muito fraca. Use uma senha mais forte.',
};

interface AuthFailure {
  message: string;
  code?: string;
}

/** Model: login, cadastro e sessão do usuário no Supabase. */
@Injectable({ providedIn: 'root' })
export class AuthModel {
  private readonly db = inject(SUPABASE_CLIENT);

  async currentUser(): Promise<AppUser | null> {
    const { data, error } = await this.db.auth.getSession();
    throwIfFailed(error);
    return toAppUser(data.session?.user);
  }

  async signIn(credentials: Credentials): Promise<AppUser> {
    const { data, error } = await this.db.auth.signInWithPassword(validateCredentials(credentials));
    throwIfFailed(error);
    const user = toAppUser(data.user);
    if (!user) {
      throw new Error('Login sem usuário retornado.');
    }
    return user;
  }

  /** Retorna `null` quando o Supabase exige confirmação por e-mail antes do login. */
  async signUp(credentials: Credentials): Promise<AppUser | null> {
    const { data, error } = await this.db.auth.signUp(validateCredentials(credentials));
    throwIfFailed(error);
    return data.session ? toAppUser(data.user) : null;
  }

  async signOut(): Promise<void> {
    const { error } = await this.db.auth.signOut();
    throwIfFailed(error);
  }
}

function throwIfFailed(error: AuthFailure | null): void {
  if (!error) {
    return;
  }
  const friendly = error.code ? FRIENDLY_AUTH_ERRORS[error.code] : undefined;
  throw friendly ? new ValidationError(friendly) : new Error(error.message);
}

function toAppUser(user: User | null | undefined): AppUser | null {
  return user ? { id: user.id, email: user.email ?? '' } : null;
}
