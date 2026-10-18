import { Router } from 'express';
import { pool, withTransaction } from '../db.js';
import { HttpError, asyncHandler } from '../lib/http.js';
import { checkImageRef, purgeOrphanImages, storeImage } from '../lib/images.js';
import { cleanProduct, makeProductId } from '../lib/validators.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
const staff = requireRole('admin', 'vendedor');

// Devuelve los productos con la forma que usa el frontend: { id, name, desc, price, img, gallery }.
async function loadProducts(where = '', params = []) {
  const [rows] = await pool.query(
    `SELECT id, nombre, descripcion, precio, img FROM productos ${where} ORDER BY seq`,
    params
  );
  if (!rows.length) return [];
  const [imgs] = await pool.query(
    'SELECT producto_id, url FROM producto_imagenes WHERE producto_id IN (?) ORDER BY producto_id, orden, id',
    [rows.map(r => r.id)]
  );
  const gallery = new Map();
  for (const g of imgs) {
    if (!gallery.has(g.producto_id)) gallery.set(g.producto_id, []);
    gallery.get(g.producto_id).push(g.url);
  }
  return rows.map(r => ({
    id: r.id,
    name: r.nombre,
    desc: r.descripcion,
    price: r.precio,
    img: r.img,
    gallery: gallery.get(r.id) || []
  }));
}

async function saveGallery(conn, productId, urls) {
  const unique = [...new Set(urls)];
  if (unique.length === 0) return;
  await conn.query('INSERT INTO producto_imagenes (producto_id, url, orden) VALUES ?', [
    unique.map((url, i) => [productId, url, i])
  ]);
}

// Valida todas las imágenes antes de abrir la transacción.
function validateImages(data) {
  checkImageRef(data.img, 'La imagen principal');
  data.gallery.forEach(g => checkImageRef(g, 'Una foto de la galería'));
}

router.get(
  '/',
  asyncHandler(async (req, res) => res.json(await loadProducts()))
);

router.post(
  '/',
  ...staff,
  asyncHandler(async (req, res) => {
    const data = cleanProduct(req.body);
    validateImages(data);
    const id = makeProductId(data.name);
    await withTransaction(async conn => {
      const img = await storeImage(conn, data.img);
      const gallery = [];
      for (const g of data.gallery) gallery.push(await storeImage(conn, g));
      await conn.query('INSERT INTO productos (id, nombre, descripcion, precio, img) VALUES (?, ?, ?, ?, ?)', [
        id,
        data.name,
        data.desc,
        data.price,
        img
      ]);
      await saveGallery(conn, id, gallery);
    });
    const [product] = await loadProducts('WHERE id = ?', [id]);
    res.status(201).json(product);
  })
);

router.put(
  '/:id',
  ...staff,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const data = cleanProduct(req.body);
    validateImages(data);
    await withTransaction(async conn => {
      const [found] = await conn.query('SELECT id FROM productos WHERE id = ? FOR UPDATE', [id]);
      if (!found.length) throw new HttpError(404, 'El producto ya no existe');
      const img = await storeImage(conn, data.img);
      const gallery = [];
      for (const g of data.gallery) gallery.push(await storeImage(conn, g));
      await conn.query('UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, img = ? WHERE id = ?', [
        data.name,
        data.desc,
        data.price,
        img,
        id
      ]);
      await conn.query('DELETE FROM producto_imagenes WHERE producto_id = ?', [id]);
      await saveGallery(conn, id, gallery);
      await purgeOrphanImages(conn);
    });
    const [product] = await loadProducts('WHERE id = ?', [id]);
    res.json(product);
  })
);

// Los pedidos ya hechos conservan su copia del nombre y precio (producto_id queda en NULL).
router.delete(
  '/:id',
  ...staff,
  asyncHandler(async (req, res) => {
    await withTransaction(async conn => {
      const [result] = await conn.query('DELETE FROM productos WHERE id = ?', [req.params.id]);
      if (result.affectedRows === 0) throw new HttpError(404, 'El producto ya no existe');
      await purgeOrphanImages(conn);
    });
    res.json({ ok: true });
  })
);

export default router;
