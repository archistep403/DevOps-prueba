import { Router } from 'express';
import { pool, withTransaction } from '../db.js';
import { HttpError, asyncHandler } from '../lib/http.js';
import { ROLES, cleanUser } from '../lib/validators.js';
import { insertUser } from '../lib/users.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
const adminOnly = requireRole('admin');

const parseId = value => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, 'Usuario no encontrado');
  return id;
};

// Bloquea a los administradores y comprueba que, tras el cambio, quede al menos uno.
async function ensureAnotherAdmin(conn, target) {
  if (target.rol !== 'admin') return;
  const [admins] = await conn.query("SELECT id FROM usuarios WHERE rol = 'admin' FOR UPDATE");
  if (!admins.some(a => a.id !== target.id)) {
    throw new HttpError(409, 'Debe quedar al menos un administrador');
  }
}

router.get(
  '/',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT id, run, nombre, apellidos, email, telefono, region, comuna, direccion, rol FROM usuarios ORDER BY id'
    );
    res.json(rows);
  })
);

router.post(
  '/',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    await insertUser(cleanUser(req.body, { allowRole: true }));
    res.status(201).json({ ok: true });
  })
);

// Cambia el rol (admin, vendedor o cliente). El cambio rige desde la siguiente petición del usuario.
router.patch(
  '/:id/rol',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const rol = req.body?.rol;
    if (!ROLES.includes(rol)) throw new HttpError(400, 'Rol no válido');
    if (id === req.user.id) throw new HttpError(400, 'No puedes cambiar tu propio rol');
    await withTransaction(async conn => {
      const [rows] = await conn.query('SELECT id, rol FROM usuarios WHERE id = ? FOR UPDATE', [id]);
      if (!rows.length) throw new HttpError(404, 'Usuario no encontrado');
      if (rows[0].rol === rol) return;
      if (rol !== 'admin') await ensureAnotherAdmin(conn, rows[0]);
      await conn.query('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, id]);
    });
    res.json({ ok: true, rol });
  })
);

// Los pedidos del usuario se conservan (guardan su propia copia del nombre, correo, RUN y teléfono).
router.delete(
  '/:id',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === req.user.id) throw new HttpError(400, 'No puedes eliminar tu propia cuenta');
    await withTransaction(async conn => {
      const [rows] = await conn.query('SELECT id, rol FROM usuarios WHERE id = ? FOR UPDATE', [id]);
      if (!rows.length) throw new HttpError(404, 'Usuario no encontrado');
      await ensureAnotherAdmin(conn, rows[0]);
      await conn.query('DELETE FROM usuarios WHERE id = ?', [id]);
    });
    res.json({ ok: true });
  })
);

export default router;
