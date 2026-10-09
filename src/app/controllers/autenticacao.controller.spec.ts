import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AutenticacaoModel } from '../models/autenticacao.model';
import { ErroValidacao } from '../models/entidades/erro-validacao';
import { Notificador } from '../nucleo/notificador';
import { AutenticacaoController } from './autenticacao.controller';

const usuario = { id: 'u1', email: 'ana@empresa.com' };
const credenciais = { email: 'ana@empresa.com', senha: '123456' };

function preparar() {
  const model = {
    usuarioAtual: vi.fn().mockResolvedValue(null),
    entrar: vi.fn().mockResolvedValue(usuario),
    cadastrar: vi.fn().mockResolvedValue(usuario),
    sair: vi.fn().mockResolvedValue(undefined),
    enviarRecuperacao: vi.fn().mockResolvedValue(undefined),
    redefinirSenha: vi.fn().mockResolvedValue(usuario),
  };
  const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
  const notificador = { sucesso: vi.fn(), erro: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      { provide: AutenticacaoModel, useValue: model },
      { provide: Router, useValue: router },
      { provide: Notificador, useValue: notificador },
    ],
  });
  return { controller: TestBed.inject(AutenticacaoController), model, router, notificador };
}

describe('AutenticacaoController', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));

  it('consulta a sessão só uma vez', async () => {
    const { controller, model } = preparar();
    model.usuarioAtual.mockResolvedValue(usuario);

    expect(await controller.estaAutenticado()).toBe(true);
    expect(await controller.estaAutenticado()).toBe(true);
    expect(model.usuarioAtual).toHaveBeenCalledTimes(1);
  });

  it('considera deslogado se a sessão falhar', async () => {
    const { controller, model } = preparar();
    model.usuarioAtual.mockRejectedValue(new Error('offline'));

    expect(await controller.estaAutenticado()).toBe(false);
  });

  it('faz login e abre o quadro', async () => {
    const { controller, router } = preparar();

    await controller.entrar(credenciais);

    expect(controller.usuario()).toEqual(usuario);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/quadro');
    expect(controller.carregando()).toBe(false);
  });

  it('mostra o erro do login e continua na tela', async () => {
    const { controller, model, router } = preparar();
    model.entrar.mockRejectedValue(new ErroValidacao('E-mail ou senha incorretos.'));

    await controller.entrar(credenciais);

    expect(controller.erro()).toBe('E-mail ou senha incorretos.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('esconde detalhes de erros técnicos', async () => {
    const { controller, model } = preparar();
    model.entrar.mockRejectedValue(new Error('fetch failed'));

    await controller.entrar(credenciais);

    expect(controller.erro()).toBe('Não foi possível entrar. Tente novamente.');
  });

  it('avisa para confirmar o e-mail quando o cadastro exige', async () => {
    const { controller, model, router, notificador } = preparar();
    model.cadastrar.mockResolvedValue(null);

    await controller.cadastrar(credenciais);

    expect(notificador.sucesso).toHaveBeenCalledWith(
      'Conta criada! Confirme seu e-mail para entrar.',
    );
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('sai e volta para o login', async () => {
    const { controller, router } = preparar();
    await controller.entrar(credenciais);

    await controller.sair();

    expect(controller.usuario()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/login');
  });

  it('avisa que o link foi enviado, sem revelar se o e-mail existe', async () => {
    const { controller, model } = preparar();

    await controller.enviarRecuperacao('ana@empresa.com');

    expect(model.enviarRecuperacao).toHaveBeenCalledWith('ana@empresa.com');
    expect(controller.recuperacaoEnviada()).toBe(true);
  });

  it('mostra erro se o envio do link falhar', async () => {
    const { controller, model } = preparar();
    model.enviarRecuperacao.mockRejectedValue(new ErroValidacao('Informe um e-mail válido.'));

    await controller.enviarRecuperacao('ana');

    expect(controller.erro()).toBe('Informe um e-mail válido.');
    expect(controller.recuperacaoEnviada()).toBe(false);
  });

  it('recusa a nova senha quando a confirmação não confere', async () => {
    const { controller, model } = preparar();

    await controller.redefinirSenha('nova123', 'outra123');

    expect(model.redefinirSenha).not.toHaveBeenCalled();
    expect(controller.erro()).toBe('As senhas não conferem.');
  });

  it('troca a senha e abre o quadro', async () => {
    const { controller, model, router, notificador } = preparar();

    await controller.redefinirSenha('nova123', 'nova123');

    expect(model.redefinirSenha).toHaveBeenCalledWith('nova123');
    expect(notificador.sucesso).toHaveBeenCalledWith('Senha alterada.');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/quadro');
  });

  it('limpa o aviso ao trocar de tela', async () => {
    const { controller } = preparar();
    await controller.enviarRecuperacao('ana@empresa.com');

    controller.limparMensagens();

    expect(controller.recuperacaoEnviada()).toBe(false);
    expect(controller.erro()).toBeNull();
  });
});
