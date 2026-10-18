import { Router } from 'express';
import { pool, withTransaction } from '../db.js';
import { HttpError, asyncHandler } from '../lib/http.js';
import { ESTADOS, cleanOrderItems } from '../lib/validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const staff = requireRole('admin', 'vendedor');

const toCode = id => `P-${String(id).padStart(4, '0')}`;
const fromCode = code => {
  const n = parseInt(String(code).replace(/\D/g, ''), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Devuelve los pedidos con la forma que usa el frontend:
// { id: 'P-0001', fecha, cliente: { email, nombre, telefono }, items, total, estado, historial }.
async function loadOrders(where = '', params = []) {
  const [rows] = await pool.query(
    `SELECT id, cliente_email, cliente_nombre, cliente_run, cliente_telefono, total, estado, creado_en
       FROM pedidos ${where} ORDER BY creado_en DESC, id DESC`,
    params
  );
  if (!rows.length) return [];
  const ids = rows.map(r => r.id);
  const [items] = await pool.query(
    'SELECT id, pedido_id, producto_id, nombre, precio, cantidad FROM pedido_items WHERE pedido_id IN (?) ORDER BY id',
    [ids]
  );
  const [history] = await pool.query(
    'SELECT pedido_id, estado, fecha FROM pedido_historial WHERE pedido_id IN (?) ORDER BY fecha, id',
    [ids]
  );
  const group = (list, key, map) => {
    const m = new Map();
    for (const row of list) {
      if (!m.has(row[key])) m.set(row[key], []);
      m.get(row[key]).push(map(row));
    }
    return m;
  };
  const itemsByOrder = group(items, 'pedido_id', i => ({
    id: i.producto_id || `x${i.id}`, // si el producto se borró, la línea sigue existiendo
    name: i.nombre,
    price: i.precio,
    qty: i.cantidad
  }));
  const historyByOrder = group(history, 'pedido_id', h => ({ estado: h.estado, fecha: h.fecha.toISOString() }));
  return rows.map(r => ({
    id: toCode(r.id),
    fecha: r.creado_en.toISOString(),
    cliente: { email: r.cliente_email, nombre: r.cliente_nombre, run: r.cliente_run || '', telefono: r.cliente_telefono },
    items: itemsByOrder.get(r.id) || [],
    total: r.total,
    estado: r.estado,
    historial: historyByOrder.get(r.id) || []
  }));
}

// Pedidos del usuario con sesión iniciada.
router.get(
  '/mios',
  requireAuth,
  asyncHandler(async (req, res) => res.json(await loadOrders('WHERE usuario_id = ?', [req.user.id])))
);

// Todos los pedidos (panel de administración).
router.get(
  '/',
  ...staff,
  asyncHandler(async (req, res) => res.json(await loadOrders()))
);

// El precio y el nombre se toman de la base de datos, nunca de lo que envía el navegador.
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const wanted = cleanOrderItems(req.body);
    const orderId = await withTransaction(async conn => {
      const [products] = await conn.query('SELECT id, nombre, precio FROM productos WHERE id IN (?)', [[...wanted.keys()]]);
      if (products.length !== wanted.size) {
        throw new HttpError(400, 'Uno de los productos de tu carrito ya no está disponible. Revisa tu carrito.');
      }
      const lines = products.map(p => ({ ...p, qty: wanted.get(p.id) }));
      const total = lines.reduce((sum, l) => sum + l.precio * l.qty, 0);
      const now = new Date();
      const [result] = await conn.query(
        `INSERT INTO pedidos (usuario_id, cliente_email, cliente_nombre, cliente_run, cliente_telefono, total, estado, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
        [
          req.user.id,
          req.user.email,
          `${req.user.nombre} ${req.user.apellidos}`.trim(),
          req.user.run || null,
          req.user.telefono || '',
          total,
          now
        ]
      );
      await conn.query('INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio, cantidad) VALUES ?', [
        lines.map(l => [result.insertId, l.id, l.nombre, l.precio, l.qty])
      ]);
      await conn.query("INSERT INTO pedido_historial (pedido_id, estado, fecha) VALUES (?, 'pendiente', ?)", [
        result.insertId,
        now
      ]);
      return result.insertId;
    });
    const [order] = await loadOrders('WHERE id = ?', [orderId]);
    res.status(201).json(order);
  })
);

router.patch(
  '/:codigo/estado',
  ...staff,
  asyncHandler(async (req, res) => {
    const id = fromCode(req.params.codigo);
    const estado = req.body?.estado;
    if (!ESTADOS.includes(estado)) throw new HttpError(400, 'Estado no válido');
    if (!id) throw new HttpError(404, 'Pedido no encontrado');
    await withTransaction(async conn => {
      const [rows] = await conn.query('SELECT estado FROM pedidos WHERE id = ? FOR UPDATE', [id]);
      if (!rows.length) throw new HttpError(404, 'Pedido no encontrado');
      if (rows[0].estado === estado) return;
      await conn.query('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, id]);
      await conn.query('INSERT INTO pedido_historial (pedido_id, estado, fecha) VALUES (?, ?, ?)', [id, estado, new Date()]);
    });
    const [order] = await loadOrders('WHERE id = ?', [id]);
    res.json(order);
  })
);

export default router;
