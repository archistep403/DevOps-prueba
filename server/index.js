import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, getJwtSecret } from './config.js';
import { pool } from './db.js';
import authRouter from './routes/auth.js';
import productosRouter from './routes/productos.js';
import imagenesRouter from './routes/imagenes.js';
import pedidosRouter from './routes/pedidos.js';
import usuariosRouter from './routes/usuarios.js';
import adminRouter from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
getJwtSecret(); // falla pronto si la configuración de producción es insegura

const app = express();
app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', config.trustProxy);
app.use(express.json({ limit: '15mb' })); // las fotos del panel viajan en base64

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    // `commit` lo inyecta el Dockerfile (GIT_SHA): permite verificar qué versión está desplegada.
    res.json({ ok: true, commit: process.env.GIT_SHA || 'dev' });
  } catch {
    res.status(503).json({ ok: false, message: 'Sin conexión a MySQL' });
  }
});
app.use('/api/auth', authRouter);
app.use('/api/productos', productosRouter);
app.use('/api/imagenes', imagenesRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/admin', adminRouter);
app.use('/api', (req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

// En producción (después de `npm run build`) la misma API entrega el sitio.
const dist = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.status && err.message && err.expose !== false && err.type === undefined) {
    // HttpError propio
    return res.status(err.status).json({ message: err.message, ...(err.field ? { field: err.field } : {}) });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Las imágenes pesan demasiado (máximo 15 MB en total).' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'La petición no es un JSON válido.' });
  }
  if (err.code === 'ER_NET_PACKET_TOO_LARGE') {
    return res.status(413).json({ message: 'La imagen es demasiado grande para la configuración de MySQL (max_allowed_packet).' });
  }
  if (['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(err.code)) {
    console.error('[mysql]', err.code, err.message);
    return res.status(503).json({ message: 'No se pudo conectar con la base de datos.' });
  }
  console.error(err);
  res.status(500).json({ message: 'Error interno del servidor.' });
});

async function start() {
  try {
    await pool.query('SELECT 1 FROM productos LIMIT 1');
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_DB_ERROR') {
      console.error('Faltan la base de datos o las tablas. Ejecuta primero:  npm run db:init');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('MySQL rechazó el usuario o la contraseña. Revisa DB_USER y DB_PASSWORD en .env');
    } else if (err.code === 'ECONNREFUSED') {
      console.error(`No se pudo conectar a MySQL en ${config.db.host}:${config.db.port}. ¿Está encendido?`);
    } else {
      console.error('No se pudo conectar a MySQL:', err.message);
    }
    process.exit(1);
  }
  app.listen(config.port, () => console.log(`API de StoreGo lista en http://localhost:${config.port}`));
}

start();
