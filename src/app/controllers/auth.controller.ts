import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Notifier } from '../core/notifier';
import { AuthModel } from '../models/auth.model';
import { AppUser, Credentials } from '../models/entities/credentials';
import { errorMessage } from './error-message';

/** Controller: recebe as ações de login/cadastro/saída e decide qual tela mostrar. */
@Injectable({ providedIn: 'root' })
export class AuthController {
  private readonly model = inject(AuthModel);
  private readonly router = inject(Router);
  private readonly notifier = inject(Notifier);
  private sessionChecked = false;

  readonly user = signal<AppUser | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async isAuthenticated(): Promise<boolean> {
    if (!this.sessionChecked) {
      try {
        this.user.set(await this.model.currentUser());
      } catch (error) {
        console.error(error);
        this.user.set(null);
      }
      this.sessionChecked = true;
    }
    return this.user() !== null;
  }

  signIn(credentials: Credentials): Promise<void> {
    return this.run('Não foi possível entrar. Tente novamente.', async () => {
      this.user.set(await this.model.signIn(credentials));
      await this.router.navigateByUrl('/board');
    });
  }

  signUp(credentials: Credentials): Promise<void> {
    return this.run('Não foi possível criar a conta. Tente novamente.', async () => {
      const user = await this.model.signUp(credentials);
      if (!user) {
        this.notifier.success('Conta criada! Confirme seu e-mail para entrar.');
        return;
      }
      this.user.set(user);
      await this.router.navigateByUrl('/board');
    });
  }

  async signOut(): Promise<void> {
    try {
      await this.model.signOut();
    } catch (error) {
      console.error(error);
    }
    this.user.set(null);
    await this.router.navigateByUrl('/login');
  }

  clearError(): void {
    this.error.set(null);
  }

  private async run(fallback: string, action: () => Promise<void>): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (error) {
      this.error.set(errorMessage(error, fallback));
    } finally {
      this.loading.set(false);
    }
  }
}
