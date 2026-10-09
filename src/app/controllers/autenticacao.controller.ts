import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AutenticacaoModel } from '../models/autenticacao.model';
import { Credenciais, UsuarioApp } from '../models/entidades/credenciais';
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

  async sair(): Promise<void> {
    try {
      await this.model.sair();
    } catch (erro) {
      console.error(erro);
    }
    this.usuario.set(null);
    await this.router.navigateByUrl('/login');
  }

  limparErro(): void {
    this.erro.set(null);
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
