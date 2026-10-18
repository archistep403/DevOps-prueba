import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';

const query = vi.fn();
vi.mock('../../server/db.js', () => ({ pool: { query: (...a) => query(...a) } }));

const { signToken, requireAuth, requireRole, publicUser } = await import('../../server/middleware/auth.js');
const { getJwtSecret } = await import('../../server/config.js');
const { HttpError, asyncHandler } = await import('../../server/lib/http.js');

// Ejecuta un middleware y devuelve lo que pasó a next().
const run = (mw, req) => new Promise(resolve => mw(req, {}, resolve));

beforeEach(() => query.mockReset());

describe('requireAuth', () => {
  it('rechaza peticiones sin token (401)', async () => {
    const err = await run(requireAuth, { headers: {} });
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(401);
  });

  it('rechaza un token inválido', async () => {
    const err = await run(requireAuth, { headers: { authorization: 'Bearer basura' } });
    expect(err.status).toBe(401);
    expect(err.message).toMatch(/expiró/);
  });

  it('rechaza un token firmado con otra clave', async () => {
    const forged = jwt.sign({ sub: '1' }, 'otra-clave', { algorithm: 'HS256' });
    const err = await run(requireAuth, { headers: { authorization: `Bearer ${forged}` } });
    expect(err.status).toBe(401);
  });

  it('rechaza si el usuario ya no existe en MySQL', async () => {
    query.mockResolvedValueOnce([[]]);
    const err = await run(requireAuth, { headers: { authorization: `Bearer ${signToken(9)}` } });
    expect(err.status).toBe(401);
    expect(err.message).toMatch(/ya no es válida/);
  });

  it('carga el usuario desde MySQL en cada petición', async () => {
    const user = { id: 3, email: 'a@duoc.cl', nombre: 'Ana', rol: 'vendedor' };
    query.mockResolvedValueOnce([[user]]);
    const req = { headers: { authorization: `Bearer ${signToken(3)}` } };
    const result = await run(requireAuth, req);
    expect(result).toBeUndefined();
    expect(req.user).toEqual(user);
    expect(query.mock.calls[0][1]).toEqual(['3']);
  });
});

describe('requireRole', () => {
  const [, check] = requireRole('admin', 'vendedor');

  it('permite los roles indicados', () => {
    const next = vi.fn();
    check({ user: { rol: 'vendedor' } }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('responde 403 a otros roles', () => {
    const next = vi.fn();
    check({ user: { rol: 'cliente' } }, {}, next);
    expect(next.mock.calls[0][0].status).toBe(403);
  });
});

describe('utilidades', () => {
  it('publicUser solo expone email, nombre y rol', () => {
    expect(publicUser({ id: 1, run: '1', email: 'a@b.cl', nombre: 'A', rol: 'admin', password_hash: 'x' })).toEqual({
      email: 'a@b.cl',
      nombre: 'A',
      rol: 'admin'
    });
  });

  it('getJwtSecret devuelve siempre la misma clave durante la ejecución', () => {
    expect(getJwtSecret()).toBe(getJwtSecret());
    expect(getJwtSecret().length).toBeGreaterThan(10);
  });

  it('asyncHandler envía los errores asíncronos a next()', async () => {
    const boom = new Error('boom');
    const next = vi.fn();
    await asyncHandler(async () => {
      throw boom;
    })({}, {}, next);
    expect(next).toHaveBeenCalledWith(boom);
  });
});
