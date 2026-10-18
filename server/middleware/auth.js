import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config.js';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../lib/http.js';

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, getJwtSecret(), { algorithm: 'HS256', expiresIn: '7d' });
}

// Exige sesión válida. El usuario se vuelve a leer de MySQL en cada petición,
// así un cambio de rol o un usuario eliminado surte efecto de inmediato.
export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Debes iniciar sesión');
  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Tu sesión expiró, inicia sesión de nuevo');
  }
  const [rows] = await pool.query(
    'SELECT id, run, email, nombre, apellidos, telefono, rol FROM usuarios WHERE id = ?',
    [payload.sub]
  );
  if (!rows[0]) throw new HttpError(401, 'Tu sesión ya no es válida');
  req.user = rows[0];
  next();
});

// Uso: router.post('/', ...requireRole('admin', 'vendedor'), handler)
export const requireRole = (...roles) => [
  requireAuth,
  (req, res, next) =>
    roles.includes(req.user.rol) ? next() : next(new HttpError(403, 'No tienes permiso para esta acción'))
];

export const publicUser = u => ({ email: u.email, nombre: u.nombre, rol: u.rol });
