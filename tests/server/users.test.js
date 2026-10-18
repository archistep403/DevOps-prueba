import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();
vi.mock('../../server/db.js', () => ({ pool: { query: (...a) => query(...a) } }));

const { insertUser } = await import('../../server/lib/users.js');

const user = {
  run: '111111111', nombre: 'Ana', apellidos: 'P', email: 'a@duoc.cl', password: 'abcd',
  fechaNacimiento: null, telefono: '', region: 'R', comuna: 'C', direccion: 'D', rol: 'cliente'
};

beforeEach(() => query.mockReset());

describe('insertUser', () => {
  it('guarda la contraseña con bcrypt y devuelve el id', async () => {
    query.mockResolvedValueOnce([{ insertId: 5 }]);
    await expect(insertUser(user)).resolves.toBe(5);
    const params = query.mock.calls[0][1];
    expect(params).not.toContain('abcd');
    expect(params[4]).toMatch(/^\$2[aby]\$10\$/);
  });

  it('traduce un RUN duplicado a 409 con campo run', async () => {
    query.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY', sqlMessage: "Duplicate entry '1' for key 'usuarios.uq_usuarios_run'" });
    await expect(insertUser(user)).rejects.toMatchObject({ status: 409, field: 'run' });
  });

  it('traduce un correo duplicado a 409 con campo email', async () => {
    query.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY', sqlMessage: "Duplicate entry 'a' for key 'usuarios.email'" });
    await expect(insertUser(user)).rejects.toMatchObject({ status: 409, field: 'email' });
  });

  it('propaga otros errores sin modificarlos', async () => {
    const boom = new Error('caída');
    query.mockRejectedValueOnce(boom);
    await expect(insertUser(user)).rejects.toBe(boom);
  });
});
