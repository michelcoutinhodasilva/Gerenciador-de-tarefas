import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AutenticacaoModel } from '../models/autenticacao.model';
import { Credenciais, UsuarioApp } from '../models/entidades/credenciais';
import { ErroValidacao } from '../models/entidades/erro-validacao';
import { Notificador } from '../nucleo/notificador';
import { mensagemErro } from './mensagem-erro';

/** Controller: recebe as ações de login/cadastro/saída e decide qual tela mostrar. */
@Injectable({ providedIn: 'root' })
export class AutenticacaoController {
  private readonly model = inject(AutenticacaoModel);
  private readonly router = inject(Router);
  private readonly notificador = inject(Notificador);
  private sessaoVerificada = false;

  readonly usuario = signal<UsuarioApp | null>(null);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  /** Verdadeiro depois de pedir o link de recuperação (a resposta é sempre a mesma). */
  readonly recuperacaoEnviada = signal(false);

  async estaAutenticado(): Promise<boolean> {
    if (!this.sessaoVerificada) {
      try {
        this.usuario.set(await this.model.usuarioAtual());
      } catch (erro) {
        console.error(erro);
        this.usuario.set(null);
      }
      this.sessaoVerificada = true;
    }
    return this.usuario() !== null;
  }

  entrar(credenciais: Credenciais): Promise<void> {
    return this.executar('Não foi possível entrar. Tente novamente.', async () => {
      this.usuario.set(await this.model.entrar(credenciais));
      await this.router.navigateByUrl('/quadro');
    });
  }

  cadastrar(credenciais: Credenciais): Promise<void> {
    return this.executar('Não foi possível criar a conta. Tente novamente.', async () => {
      const usuario = await this.model.cadastrar(credenciais);
      if (!usuario) {
        this.notificador.sucesso('Conta criada! Confirme seu e-mail para entrar.');
        return;
      }
      this.usuario.set(usuario);
      await this.router.navigateByUrl('/quadro');
    });
  }

  enviarRecuperacao(email: string): Promise<void> {
    this.recuperacaoEnviada.set(false);
    return this.executar('Não foi possível enviar o link. Tente novamente.', async () => {
      await this.model.enviarRecuperacao(email);
      this.recuperacaoEnviada.set(true);
    });
  }

  redefinirSenha(senha: string, confirmacao: string): Promise<void> {
    return this.executar('Não foi possível trocar a senha. Peça um novo link.', async () => {
      if (senha !== confirmacao) {
        throw new ErroValidacao('As senhas não conferem.');
      }
      this.usuario.set(await this.model.redefinirSenha(senha));
      this.notificador.sucesso('Senha alterada.');
      await this.router.navigateByUrl('/quadro');
    });
  }

  async sair(): Promise<void> {
    try {
      await this.model.sair();
    } catch (erro) {
      console.error(erro);
    }
    this.usuario.set(null);
    await this.router.navigateByUrl('/login');
  }

  /** Limpa o erro e o aviso ao trocar de tela. */
  limparMensagens(): void {
    this.erro.set(null);
    this.recuperacaoEnviada.set(false);
  }

  private async executar(padrao: string, acao: () => Promise<void>): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      await acao();
    } catch (erro) {
      this.erro.set(mensagemErro(erro, padrao));
    } finally {
      this.carregando.set(false);
    }
  }
}
