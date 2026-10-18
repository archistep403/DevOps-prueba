import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatCLP, formatRun } from '../../src/lib/format.js';
import { ORDER_STATUSES, TRACKING_STEPS, orderHistory, statusLabel, sumSales } from '../../src/lib/orders.js';
import { MAX_GALLERY, PLACEHOLDER_IMG, productImages } from '../../src/lib/products.js';
import {
  ADMIN_USER_RULES, LOGIN_RULES, PRODUCT_RULES, REGISTER_RULES, emailRule, isAllowedEmail,
  maxLength, passwordRule, required, validarRun
} from '../../src/lib/validators.js';
import { readJSON, removeKey, writeJSON } from '../../src/lib/storage.js';
import { ApiError, UNAUTHORIZED_EVENT, api, clearToken, getToken, setToken } from '../../src/lib/api.js';

// localStorage mínimo para el entorno Node.
function fakeStorage() {
  const data = new Map();
  return {
    getItem: k => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: k => data.delete(k)
  };
}

beforeEach(() => vi.stubGlobal('localStorage', fakeStorage()));
afterEach(() => vi.unstubAllGlobals());

describe('format', () => {
  it('formatCLP agrega $ y separador de miles chileno', () => {
    expect(formatCLP(900000)).toBe('$900.000');
  });
  it('formatRun separa miles y dígito verificador', () => {
    expect(formatRun('111111111')).toBe('11.111.111-1');
    expect(formatRun('')).toBe('');
    expect(formatRun(null)).toBe('');
    expect(formatRun('1')).toBe('1');
  });
});

describe('orders', () => {
  it('statusLabel traduce estados y devuelve el valor desconocido tal cual', () => {
    expect(statusLabel('enviado')).toBe('Enviado');
    expect(statusLabel('raro')).toBe('raro');
    expect(ORDER_STATUSES).toHaveLength(4);
    expect(TRACKING_STEPS.map(s => s.value)).toEqual(['pendiente', 'enviado', 'entregado']);
  });
  it('sumSales ignora pedidos cancelados', () => {
    expect(sumSales([{ estado: 'pendiente', total: 100 }, { estado: 'cancelado', total: 999 }, { estado: 'entregado', total: 50 }])).toBe(150);
  });
  it('orderHistory usa el historial real o reconstruye uno para pedidos antiguos', () => {
    const real = [{ estado: 'pendiente', fecha: 'a' }];
    expect(orderHistory({ historial: real })).toBe(real);
    expect(orderHistory({ estado: 'pendiente', fecha: 'f' })).toEqual([{ estado: 'pendiente', fecha: 'f' }]);
    expect(orderHistory({ estado: 'enviado', fecha: 'f' })).toHaveLength(2);
  });
});

describe('products', () => {
  it('productImages pone la principal primero y quita repetidas y vacías', () => {
    expect(productImages({ img: 'a', gallery: ['b', 'a', ''] })).toEqual(['a', 'b']);
    expect(productImages({ img: 'a' })).toEqual(['a']);
  });
  it('constantes del catálogo', () => {
    expect(MAX_GALLERY).toBe(6);
    expect(PLACEHOLDER_IMG.startsWith('data:image/svg+xml;utf8,')).toBe(true);
  });
});

describe('validators (cliente)', () => {
  it('helpers básicos', () => {
    expect(required('')).not.toBe('');
    expect(required('x')).toBe('');
    expect(maxLength('abc', 2)).toMatch(/Máximo 2/);
    expect(maxLength('ab', 2)).toBe('');
    expect(isAllowedEmail('a@DUOC.cl')).toBe(true);
    expect(isAllowedEmail('a@hotmail.com')).toBe(false);
    expect(isAllowedEmail('sin-arroba')).toBe(false);
  });
  it('validarRun coincide con el servidor', () => {
    expect(validarRun('111111111')).toBe(true);
    expect(validarRun('6000000k')).toBe(true);
    expect(validarRun('10000130')).toBe(true);
    expect(validarRun('111111112')).toBe(false);
  });
  it('emailRule y passwordRule encadenan las reglas en orden', () => {
    expect(emailRule('')).toMatch(/obligatorio/);
    expect(emailRule('malo')).toMatch(/válido/);
    expect(emailRule('a@hotmail.com')).toMatch(/Solo correos/);
    expect(emailRule('a@duoc.cl')).toBe('');
    expect(passwordRule('abc')).toMatch(/entre 4 y 10/);
    expect(passwordRule('abcd')).toBe('');
    expect(LOGIN_RULES.email).toBe(emailRule);
  });
  it('REGISTER_RULES valida cada campo', () => {
    const R = REGISTER_RULES;
    expect(R.run('')).toMatch(/obligatorio/);
    expect(R.run('123')).toMatch(/entre 7 y 9/);
    expect(R.run('111111112')).toMatch(/inválido/);
    expect(R.run('111111111')).toBe('');
    expect(R.nombre('x'.repeat(51))).toMatch(/50/);
    expect(R.apellidos('x'.repeat(101))).toMatch(/100/);
    expect(R.emailConfirm('b@duoc.cl', { email: 'a@duoc.cl' })).toMatch(/no coinciden/);
    expect(R.emailConfirm('A@duoc.cl', { email: ' a@duoc.cl' })).toBe('');
    expect(R.passwordConfirm('x', { password: 'y' })).toMatch(/no coinciden/);
    expect(R.passwordConfirm('y', { password: 'y' })).toBe('');
    expect(R.fechaNacimiento('2999-01-01')).toMatch(/futura/);
    expect(R.fechaNacimiento('')).toBe('');
    expect(R.telefono('')).toBe('');
    expect(R.telefono('12')).toMatch(/8 y 12/);
    expect(R.region('')).toMatch(/región/);
    expect(R.comuna('')).toMatch(/comuna/);
    expect(R.direccion('x'.repeat(301))).toMatch(/300/);
    expect(ADMIN_USER_RULES.tipoUsuario('')).toMatch(/tipo/);
    expect(ADMIN_USER_RULES.tipoUsuario('admin')).toBe('');
  });
  it('PRODUCT_RULES valida precio entero positivo', () => {
    expect(PRODUCT_RULES.price('')).toMatch(/obligatorio/);
    expect(PRODUCT_RULES.price('0')).toMatch(/mayor a 0/);
    expect(PRODUCT_RULES.price('1.5')).toMatch(/mayor a 0/);
    expect(PRODUCT_RULES.price('100000001')).toMatch(/alto/);
    expect(PRODUCT_RULES.price('1000')).toBe('');
    expect(PRODUCT_RULES.name('x'.repeat(61))).toMatch(/60/);
    expect(PRODUCT_RULES.desc('x'.repeat(201))).toMatch(/200/);
  });
});

describe('storage', () => {
  it('lee, escribe y borra JSON', () => {
    expect(readJSON('k', 'def')).toBe('def');
    expect(writeJSON('k', { a: 1 })).toBe(true);
    expect(readJSON('k', null)).toEqual({ a: 1 });
    removeKey('k');
    expect(readJSON('k', 'def')).toBe('def');
  });
  it('tolera JSON corrupto y almacenamiento no disponible', () => {
    localStorage.setItem('k', '{roto');
    expect(readJSON('k', 'def')).toBe('def');
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('x'); },
      setItem: () => { throw new Error('x'); },
      removeItem: () => { throw new Error('x'); }
    });
    expect(readJSON('k', 'def')).toBe('def');
    expect(writeJSON('k', 1)).toBe(false);
    expect(() => removeKey('k')).not.toThrow();
    expect(getToken()).toBeNull();
    expect(() => setToken('t')).not.toThrow();
    expect(() => clearToken()).not.toThrow();
  });
});

describe('api()', () => {
  const respond = (status, body) =>
    vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

  it('agrega el token Bearer y el cuerpo JSON', async () => {
    setToken('abc');
    const fetchMock = respond(200, { ok: true });
    vi.stubGlobal('fetch', fetchMock);
    await expect(api('/x', { method: 'POST', body: { a: 1 } })).resolves.toEqual({ ok: true });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/x');
    expect(opts.headers.Authorization).toBe('Bearer abc');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.body).toBe('{"a":1}');
  });

  it('con auth:false no envía el token', async () => {
    setToken('abc');
    const fetchMock = respond(200, {});
    vi.stubGlobal('fetch', fetchMock);
    await api('/x', { auth: false });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('lanza ApiError con mensaje y campo del servidor', async () => {
    vi.stubGlobal('fetch', respond(400, { message: 'Malo', field: 'email' }));
    await expect(api('/x')).rejects.toMatchObject({ name: 'ApiError', message: 'Malo', status: 400, field: 'email' });
  });

  it('usa mensajes por defecto si no hay cuerpo JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error('x'); } }));
    await expect(api('/x')).rejects.toThrow(/servidor no responde/);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => null }));
    await expect(api('/x')).rejects.toThrow('Error 404');
  });

  it('avisa con un evento cuando una sesión con token recibe 401', async () => {
    setToken('abc');
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    vi.stubGlobal('fetch', respond(401, { message: 'No' }));
    await expect(api('/x')).rejects.toBeInstanceOf(ApiError);
    expect(dispatchEvent.mock.calls[0][0].type).toBe(UNAUTHORIZED_EVENT);
  });

  it('traduce fallos de red a ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('red')));
    await expect(api('/x')).rejects.toThrow(/No se pudo conectar/);
  });
});
