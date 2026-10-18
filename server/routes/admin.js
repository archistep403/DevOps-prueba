import { Router } from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get(
  '/resumen',
  ...requireRole('admin', 'vendedor'),
  asyncHandler(async (req, res) => {
    const [[r]] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM productos) AS productos,
         (SELECT COUNT(*) FROM usuarios) AS usuarios,
         (SELECT COUNT(*) FROM pedidos) AS pedidos,
         (SELECT COUNT(*) FROM pedidos WHERE estado = 'pendiente') AS pendientes,
         (SELECT COALESCE(SUM(total), 0) FROM pedidos WHERE estado <> 'cancelado') AS ventas`
    );
    res.json({
      productos: Number(r.productos),
      usuarios: Number(r.usuarios),
      pedidos: Number(r.pedidos),
      pendientes: Number(r.pendientes),
      ventas: Number(r.ventas)
    });
  })
);

export default router;
