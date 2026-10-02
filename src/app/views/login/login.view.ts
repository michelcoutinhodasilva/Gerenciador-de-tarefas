import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { AuthController } from '../../controllers/auth.controller';

type Mode = 'signIn' | 'signUp';

/** View: tela de login/cadastro. As regras ficam no Model; aqui só se coleta e envia. */
@Component({
  selector: 'app-login-view',
  imports: [ReactiveFormsModule, Button, InputText],
  templateUrl: './login.view.html',
})
export class LoginView {
  protected readonly auth = inject(AuthController);
  protected readonly mode = signal<Mode>('signIn');
  protected readonly form = inject(NonNullableFormBuilder).group({ email: '', password: '' });

  protected toggleMode(): void {
    this.mode.update((mode) => (mode === 'signIn' ? 'signUp' : 'signIn'));
    this.auth.clearError();
  }

  protected submit(): void {
    const credentials = this.form.getRawValue();
    if (this.mode() === 'signIn') {
      this.auth.signIn(credentials);
    } else {
      this.auth.signUp(credentials);
    }
  }
}
