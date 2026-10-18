import { Router } from 'express';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../lib/http.js';

const router = Router();

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, 'Imagen no encontrada');
    const [rows] = await pool.query('SELECT mime, datos FROM imagenes WHERE id = ?', [id]);
    if (!rows.length) throw new HttpError(404, 'Imagen no encontrada');
    res.set({
      'Content-Type': rows[0].mime,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff'
    });
    res.send(rows[0].datos);
  })
);

export default router;
