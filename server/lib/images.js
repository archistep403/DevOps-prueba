import { HttpError } from './http.js';

const PLACEHOLDER_PREFIX = 'data:image/svg+xml;utf8,'; // imagen "Sin imagen" del frontend
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function parseDataUrl(value) {
  const comma = value.indexOf(',');
  if (comma === -1) return null;
  const [mime, enc] = value.slice(5, comma).split(';');
  if (enc !== 'base64' || !ALLOWED_MIME.has(mime)) return null;
  return value.slice(comma + 1);
}

// Detecta el tipo real mirando los primeros bytes (no se confía en lo que declara el navegador).
export function sniffMime(b) {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.toString('latin1', 0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png';
  if (b.toString('latin1', 0, 4) === 'GIF8') return 'image/gif';
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (b.toString('latin1', 4, 8) === 'ftyp' && /^avi[fs]$/.test(b.toString('latin1', 8, 12))) return 'image/avif';
  return null;
}

// Valida lo que llega como imagen: una foto en base64 (se guardará en MySQL), una ruta del sitio o una URL.
export function checkImageRef(value, label = 'La imagen') {
  if (typeof value !== 'string' || value.trim() === '') throw new HttpError(400, `${label} es obligatoria`);
  const v = value.trim();
  if (v.startsWith('data:')) {
    if (v.startsWith(PLACEHOLDER_PREFIX)) {
      if (v.length > 2000) throw new HttpError(400, `${label} no es válida`);
      return v;
    }
    if (parseDataUrl(v) === null) throw new HttpError(400, `${label} debe ser JPG, PNG, WEBP, GIF o AVIF`);
    return v;
  }
  if (v.length > 2000) throw new HttpError(400, `${label} no es válida`);
  if (/^https?:\/\//i.test(v) || (v.startsWith('/') && !v.startsWith('//'))) return v;
  throw new HttpError(400, `${label} no es válida`);
}

// Si es una foto en base64 la guarda en la tabla `imagenes` y devuelve su URL (/api/imagenes/ID).
// Rutas y URLs se guardan tal cual.
export async function storeImage(conn, value) {
  const v = checkImageRef(value);
  if (!v.startsWith('data:') || v.startsWith(PLACEHOLDER_PREFIX)) return v;
  const buf = Buffer.from(parseDataUrl(v), 'base64');
  if (buf.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'Una de las imágenes supera los 3 MB');
  const mime = sniffMime(buf);
  if (!mime) throw new HttpError(400, 'Uno de los archivos no es una imagen válida');
  const [result] = await conn.query('INSERT INTO imagenes (mime, datos) VALUES (?, ?)', [mime, buf]);
  return `/api/imagenes/${result.insertId}`;
}

// Borra las fotos que ya no usa ningún producto (por ejemplo, tras reemplazar o quitar una).
export async function purgeOrphanImages(conn) {
  await conn.query(
    `DELETE i FROM imagenes i
      WHERE NOT EXISTS (SELECT 1 FROM productos p WHERE p.img = CONCAT('/api/imagenes/', i.id))
        AND NOT EXISTS (SELECT 1 FROM producto_imagenes g WHERE g.url = CONCAT('/api/imagenes/', i.id))`
  );
}
