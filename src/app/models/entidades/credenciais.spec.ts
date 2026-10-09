import { SENHA_TAMANHO_MINIMO, validarCredenciais } from './credenciais';
import { ErroValidacao } from './erro-validacao';

describe('Credenciais (entidade)', () => {
  it('normaliza o e-mail', () => {
    expect(validarCredenciais({ email: '  Ana@Empresa.COM ', senha: '123456' })).toEqual({
      email: 'ana@empresa.com',
      senha: '123456',
    });
  });

  it('recusa e-mail inválido', () => {
    expect(() => validarCredenciais({ email: 'ana', senha: '123456' })).toThrow(ErroValidacao);
  });

  it('recusa senha curta', () => {
    const senha = 'a'.repeat(SENHA_TAMANHO_MINIMO - 1);
    expect(() => validarCredenciais({ email: 'ana@empresa.com', senha })).toThrow(/senha/);
  });
});
