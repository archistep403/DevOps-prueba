import crypto from 'node:crypto';
import { HttpError } from './http.js';

// Reglas equivalentes a las del frontend (src/lib/validators.js): el servidor nunca confía en el navegador.
export const ALLOWED_EMAIL_DOMAINS = ['gmail.com', 'duoc.cl', 'profesor.duoc.cl'];
export const ROLES = ['admin', 'vendedor', 'cliente'];
export const ESTADOS = ['pendiente', 'enviado', 'entregado', 'cancelado'];
export const MAX_GALLERY = 6;
export const MAX_QTY = 99;

const fail = (message, field) => {
  throw new HttpError(400, message, field ? { field } : {});
};
const text = v => (typeof v === 'string' ? v.trim() : '');

export function validarRun(run) {
  if (!/^\d{6,8}[0-9kK]$/.test(run)) return false;
  const cuerpo = run.slice(0, -1);
  const dv = run.slice(-1).toUpperCase();
  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === esperado;
}

export function cleanUser(body, { allowRole = false } = {}) {
  const b = body && typeof body === 'object' ? body : {};
  const run = text(b.run).toUpperCase();
  const nombre = text(b.nombre);
  const apellidos = text(b.apellidos);
  const email = text(b.email).toLowerCase();
  const password = typeof b.password === 'string' ? b.password : '';
  const telefono = text(b.telefono);
  const region = text(b.region);
  const comuna = text(b.comuna);
  const direccion = text(b.direccion);
  const fechaNacimiento = text(b.fechaNacimiento);

  if (run.length < 7 || run.length > 9 || !validarRun(run)) {
    fail('RUN inválido: sin puntos ni guion y con dígito verificador correcto', 'run');
  }
  if (!nombre) fail('Este campo es obligatorio', 'nombre');
  if (nombre.length > 50) fail('Máximo 50 caracteres', 'nombre');
  if (!apellidos) fail('Este campo es obligatorio', 'apellidos');
  if (apellidos.length > 100) fail('Máximo 100 caracteres', 'apellidos');
  if (!email) fail('Este campo es obligatorio', 'email');
  if (email.length > 100) fail('Máximo 100 caracteres', 'email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Ingresa un correo válido', 'email');
  if (!ALLOWED_EMAIL_DOMAINS.includes(email.split('@')[1])) {
    fail('Solo correos @duoc.cl, @profesor.duoc.cl o @gmail.com', 'email');
  }
  if (password.length < 4 || password.length > 10) fail('La contraseña debe tener entre 4 y 10 caracteres', 'password');
  if (telefono && !/^\+?\d{8,12}$/.test(telefono)) fail('Ingresa entre 8 y 12 dígitos', 'telefono');

  let fecha = null;
  if (fechaNacimiento) {
    const d = new Date(`${fechaNacimiento}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== fechaNacimiento) {
      fail('Fecha no válida', 'fechaNacimiento');
    }
    if (d > new Date()) fail('La fecha no puede ser futura', 'fechaNacimiento');
    fecha = fechaNacimiento;
  }

  if (!region) fail('Selecciona una región', 'region');
  if (region.length > 100) fail('Región no válida', 'region');
  if (!comuna) fail('Selecciona una comuna', 'comuna');
  if (comuna.length > 100) fail('Comuna no válida', 'comuna');
  if (!direccion) fail('Este campo es obligatorio', 'direccion');
  if (direccion.length > 300) fail('Máximo 300 caracteres', 'direccion');

  // El registro público siempre crea clientes; solo el administrador elige el rol.
  let rol = 'cliente';
  if (allowRole) {
    rol = text(b.rol);
    if (!ROLES.includes(rol)) fail('Selecciona un tipo de usuario', 'tipoUsuario');
  }

  return { run, nombre, apellidos, email, password, telefono, fechaNacimiento: fecha, region, comuna, direccion, rol };
}

export function cleanProduct(body) {
  const b = body && typeof body === 'object' ? body : {};
  const name = text(b.name);
  const desc = text(b.desc);
  const price = Number(b.price);
  if (!name) fail('El nombre es obligatorio');
  if (name.length > 60) fail('El nombre admite máximo 60 caracteres');
  if (!desc) fail('La descripción es obligatoria');
  if (desc.length > 200) fail('La descripción admite máximo 200 caracteres');
  if (!Number.isInteger(price) || price <= 0) fail('Ingresa un precio entero mayor a 0');
  if (price > 100000000) fail('El precio es demasiado alto');
  const gallery = Array.isArray(b.gallery) ? b.gallery.filter(g => typeof g === 'string' && g.trim() !== '') : [];
  if (gallery.length > MAX_GALLERY) fail(`Máximo ${MAX_GALLERY} fotos en la galería`);
  return { name, desc, price, img: b.img, gallery };
}

export function makeProductId(name) {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50)
    .replace(/-$/, '');
  return `${slug || 'producto'}-${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`;
}

// Devuelve un Map id -> cantidad con las líneas del carrito ya validadas y unidas.
export function cleanOrderItems(body) {
  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) fail('Tu carrito está vacío');
  if (items.length > 50) fail('Demasiados productos en un solo pedido');
  const merged = new Map();
  for (const it of items) {
    const id = typeof it?.id === 'string' ? it.id : '';
    const qty = Number(it?.qty);
    if (!id || !Number.isInteger(qty) || qty < 1) fail('Hay un producto con datos inválidos');
    merged.set(id, (merged.get(id) || 0) + qty);
  }
  for (const qty of merged.values()) {
    if (qty > MAX_QTY) fail(`Cantidad máxima por producto: ${MAX_QTY}`);
  }
  return merged;
}
