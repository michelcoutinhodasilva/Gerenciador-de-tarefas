import { validarCredenciais } from './credenciais';
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

  it('aceita senha de qualquer tamanho', () => {
    expect(validarCredenciais({ email: 'ana@empresa.com', senha: 'a' }).senha).toBe('a');
  });

  it('recusa senha vazia', () => {
    expect(() => validarCredenciais({ email: 'ana@empresa.com', senha: '' })).toThrow(
      'Informe uma senha.',
    );
  });
});
