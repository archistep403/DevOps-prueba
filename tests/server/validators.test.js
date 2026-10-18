import { describe, expect, it } from 'vitest';
import {
  ALLOWED_EMAIL_DOMAINS,
  cleanOrderItems,
  cleanProduct,
  cleanUser,
  makeProductId,
  validarRun
} from '../../server/lib/validators.js';
import { HttpError } from '../../server/lib/http.js';

const validUser = () => ({
  run: '111111111',
  nombre: 'Ana',
  apellidos: 'Pérez Soto',
  email: 'Ana@Duoc.cl',
  password: 'abcd',
  telefono: '+56912345678',
  fechaNacimiento: '2000-02-29',
  region: 'Metropolitana',
  comuna: 'Santiago',
  direccion: 'Calle 1 #123'
});

// Ejecuta fn y devuelve el HttpError lanzado (o falla si no lanza).
function catchHttp(fn) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(HttpError);
    return err;
  }
  throw new Error('Se esperaba un HttpError');
}

describe('validarRun (módulo 11)', () => {
  it('acepta RUN con dígito verificador numérico', () => {
    expect(validarRun('111111111')).toBe(true);
    expect(validarRun('123456785')).toBe(true);
    expect(validarRun('70000008')).toBe(true);
  });

  it('acepta el dígito verificador 0', () => {
    expect(validarRun('10000130')).toBe(true);
  });

  it('acepta la K en mayúscula o minúscula', () => {
    expect(validarRun('6000000K')).toBe(true);
    expect(validarRun('6000000k')).toBe(true);
  });

  it('rechaza formatos inválidos y dígitos verificadores incorrectos', () => {
    expect(validarRun('')).toBe(false);
    expect(validarRun('abc')).toBe(false);
    expect(validarRun('11.111.111-1')).toBe(false);
    expect(validarRun('111111112')).toBe(false);
  });
});

describe('cleanUser', () => {
  it('normaliza y devuelve los datos de un cliente válido', () => {
    const u = cleanUser(validUser());
    expect(u.email).toBe('ana@duoc.cl');
    expect(u.rol).toBe('cliente');
    expect(u.fechaNacimiento).toBe('2000-02-29');
  });

  it('el registro público ignora el rol enviado', () => {
    expect(cleanUser({ ...validUser(), rol: 'admin' }).rol).toBe('cliente');
  });

  it('allowRole acepta roles válidos y rechaza los desconocidos', () => {
    expect(cleanUser({ ...validUser(), rol: 'vendedor' }, { allowRole: true }).rol).toBe('vendedor');
    expect(catchHttp(() => cleanUser({ ...validUser(), rol: 'root' }, { allowRole: true })).field).toBe('tipoUsuario');
  });

  it('acepta teléfono y fecha vacíos', () => {
    const u = cleanUser({ ...validUser(), telefono: '', fechaNacimiento: '' });
    expect(u.telefono).toBe('');
    expect(u.fechaNacimiento).toBeNull();
  });

  it('trata un body que no es objeto como vacío', () => {
    expect(catchHttp(() => cleanUser(null)).field).toBe('run');
  });

  const cases = [
    ['run', { run: '111111112' }],
    ['nombre', { nombre: '' }],
    ['nombre', { nombre: 'x'.repeat(51) }],
    ['apellidos', { apellidos: '' }],
    ['apellidos', { apellidos: 'x'.repeat(101) }],
    ['email', { email: '' }],
    ['email', { email: 'a'.repeat(100) + '@duoc.cl' }],
    ['email', { email: 'sin-arroba' }],
    ['email', { email: 'ana@hotmail.com' }],
    ['password', { password: 'abc' }],
    ['password', { password: 'x'.repeat(11) }],
    ['telefono', { telefono: '123' }],
    ['fechaNacimiento', { fechaNacimiento: '2001-02-30' }],
    ['fechaNacimiento', { fechaNacimiento: '2999-01-01' }],
    ['fechaNacimiento', { fechaNacimiento: 'ayer' }],
    ['region', { region: '' }],
    ['region', { region: 'x'.repeat(101) }],
    ['comuna', { comuna: '' }],
    ['comuna', { comuna: 'x'.repeat(101) }],
    ['direccion', { direccion: '' }],
    ['direccion', { direccion: 'x'.repeat(301) }]
  ];
  it.each(cases)('rechaza con 400 y campo %s: %j', (field, patch) => {
    const err = catchHttp(() => cleanUser({ ...validUser(), ...patch }));
    expect(err.status).toBe(400);
    expect(err.field).toBe(field);
  });

  it('solo permite los dominios de correo configurados', () => {
    expect(ALLOWED_EMAIL_DOMAINS).toEqual(['gmail.com', 'duoc.cl', 'profesor.duoc.cl']);
  });
});

describe('cleanProduct', () => {
  const valid = { name: ' PS5 ', desc: 'Consola', price: 900000, img: '/img/ps5.avif', gallery: ['/a.jpg', '', 3] };

  it('limpia espacios y descarta elementos de galería inválidos', () => {
    expect(cleanProduct(valid)).toEqual({ name: 'PS5', desc: 'Consola', price: 900000, img: '/img/ps5.avif', gallery: ['/a.jpg'] });
  });

  it('usa galería vacía si no es arreglo', () => {
    expect(cleanProduct({ ...valid, gallery: 'x' }).gallery).toEqual([]);
  });

  it.each([
    [{ name: '' }],
    [{ name: 'x'.repeat(61) }],
    [{ desc: '' }],
    [{ desc: 'x'.repeat(201) }],
    [{ price: 0 }],
    [{ price: 10.5 }],
    [{ price: 'abc' }],
    [{ price: 100000001 }],
    [{ gallery: Array(7).fill('/a.jpg') }]
  ])('rechaza datos inválidos %j', patch => {
    expect(catchHttp(() => cleanProduct({ ...valid, ...patch })).status).toBe(400);
  });

  it('body inválido produce error 400', () => {
    expect(catchHttp(() => cleanProduct(undefined)).status).toBe(400);
  });
});

describe('makeProductId', () => {
  it('genera un slug sin tildes ni símbolos y con sufijo único', () => {
    const id = makeProductId('Consola Ñandú & Más!');
    expect(id).toMatch(/^consola-nandu-mas-[a-z0-9]+$/);
    expect(makeProductId('Consola Ñandú & Más!')).not.toBe(id);
  });

  it('usa "producto" si el nombre no tiene caracteres válidos', () => {
    expect(makeProductId('!!!')).toMatch(/^producto-/);
  });
});

describe('cleanOrderItems', () => {
  it('une líneas repetidas del mismo producto', () => {
    const m = cleanOrderItems({ items: [{ id: 'ps5', qty: 1 }, { id: 'ps5', qty: 2 }, { id: 'ps4', qty: 1 }] });
    expect(m.get('ps5')).toBe(3);
    expect(m.get('ps4')).toBe(1);
  });

  it.each([
    [undefined],
    [{ items: [] }],
    [{ items: Array(51).fill({ id: 'a', qty: 1 }) }],
    [{ items: [{ id: '', qty: 1 }] }],
    [{ items: [{ id: 'a', qty: 0 }] }],
    [{ items: [{ id: 'a', qty: 1.5 }] }],
    [{ items: [null] }],
    [{ items: [{ id: 'a', qty: 60 }, { id: 'a', qty: 60 }] }]
  ])('rechaza carritos inválidos %j', body => {
    expect(catchHttp(() => cleanOrderItems(body)).status).toBe(400);
  });
});
