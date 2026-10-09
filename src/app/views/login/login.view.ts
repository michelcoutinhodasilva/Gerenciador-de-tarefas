import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { AutenticacaoController } from '../../controllers/autenticacao.controller';

type Modo = 'entrar' | 'cadastrar';

/** View: tela de login/cadastro. As regras ficam no Model; aqui só se coleta e envia. */
@Component({
  selector: 'app-login-view',
  imports: [ReactiveFormsModule, Button, InputText],
  templateUrl: './login.view.html',
})
export class LoginView {
  protected readonly autenticacao = inject(AutenticacaoController);
  protected readonly modo = signal<Modo>('entrar');
  protected readonly formulario = inject(NonNullableFormBuilder).group({ email: '', senha: '' });

  protected alternarModo(): void {
    this.modo.update((modo) => (modo === 'entrar' ? 'cadastrar' : 'entrar'));
    this.autenticacao.limparErro();
  }

  protected enviar(): void {
    const credenciais = this.formulario.getRawValue();
    if (this.modo() === 'entrar') {
      this.autenticacao.entrar(credenciais);
    } else {
      this.autenticacao.cadastrar(credenciais);
    }
  }
}
