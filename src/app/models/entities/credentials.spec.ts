import { PASSWORD_MIN_LENGTH, validateCredentials } from './credentials';
import { ValidationError } from './validation-error';

describe('Credentials (entidade)', () => {
  it('normaliza o e-mail', () => {
    expect(validateCredentials({ email: '  Ana@Empresa.COM ', password: '123456' })).toEqual({
      email: 'ana@empresa.com',
      password: '123456',
    });
  });

  it('recusa e-mail inválido', () => {
    expect(() => validateCredentials({ email: 'ana', password: '123456' })).toThrow(
      ValidationError,
    );
  });

  it('recusa senha curta', () => {
    const password = 'a'.repeat(PASSWORD_MIN_LENGTH - 1);
    expect(() => validateCredentials({ email: 'ana@empresa.com', password })).toThrow(/senha/);
  });
});
