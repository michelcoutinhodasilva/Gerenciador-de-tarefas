import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { AutenticacaoController } from '../../controllers/autenticacao.controller';

type Modo = 'entrar' | 'cadastrar' | 'recuperar' | 'redefinir';

const TEXTOS: Readonly<
  Record<Modo, { cabecalho: string; titulo: string; descricao: string; botao: string }>
> = {
  entrar: {
    cabecalho: 'ACESSO À CONTA',
    titulo: 'Entre na sua conta',
    descricao: 'Acesse seu quadro e continue de onde parou.',
    botao: 'Entrar',
  },
  cadastrar: {
    cabecalho: 'NOVO CADASTRO',
    titulo: 'Crie sua conta',
    descricao: 'Crie seu acesso e organize seu fluxo de trabalho.',
    botao: 'Criar conta',
  },
  recuperar: {
    cabecalho: 'RECUPERAR SENHA',
    titulo: 'Esqueceu a senha?',
    descricao: 'Informe seu e-mail e enviaremos um link para criar uma nova senha.',
    botao: 'Enviar link',
  },
  redefinir: {
    cabecalho: 'NOVA SENHA',
    titulo: 'Crie uma nova senha',
    descricao: 'Escolha uma senha nova para voltar ao seu quadro.',
    botao: 'Salvar nova senha',
  },
};

/** View: telas de login, cadastro, recuperação e nova senha. As regras ficam no Model. */
@Component({
  selector: 'app-login-view',
  imports: [ReactiveFormsModule, Button, InputText],
  templateUrl: './login.view.html',
})
export class LoginView {
  protected readonly autenticacao = inject(AutenticacaoController);
  protected readonly modo = signal<Modo>(
    (inject(ActivatedRoute).snapshot.data['modo'] as Modo | undefined) ?? 'entrar',
  );
  protected readonly texto = computed(() => TEXTOS[this.modo()]);
  protected readonly formulario = inject(NonNullableFormBuilder).group({
    email: '',
    senha: '',
    confirmacao: '',
  });

  protected irPara(modo: Modo): void {
    this.modo.set(modo);
    this.autenticacao.limparMensagens();
  }

  protected enviar(): void {
    const { email, senha, confirmacao } = this.formulario.getRawValue();
    switch (this.modo()) {
      case 'entrar':
        this.autenticacao.entrar({ email, senha });
        break;
      case 'cadastrar':
        this.autenticacao.cadastrar({ email, senha });
        break;
      case 'recuperar':
        this.autenticacao.enviarRecuperacao(email);
        break;
      case 'redefinir':
        this.autenticacao.redefinirSenha(senha, confirmacao);
        break;
    }
  }
}
