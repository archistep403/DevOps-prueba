import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { HttpError, asyncHandler } from '../lib/http.js';
import { cleanUser } from '../lib/validators.js';
import { insertUser } from '../lib/users.js';
import { publicUser, requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

// Hash de relleno: así tarda lo mismo si el correo no existe (no revela qué cuentas hay).
const DUMMY_HASH = bcrypt.hashSync('relleno-sin-uso', 10);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos fallidos. Intenta de nuevo en unos minutos.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados registros desde esta conexión. Intenta más tarde.' }
});

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const [rows] = await pool.query(
      'SELECT id, nombre, email, password_hash, rol FROM usuarios WHERE email = ?',
      [email]
    );
    const user = rows[0];
    const ok = await bcrypt.compare(password.slice(0, 100), user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, 'Correo o contraseña incorrectos');
    res.json({ token: signToken(user.id), user: publicUser(user) });
  })
);

router.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    await insertUser(cleanUser(req.body)); // rol siempre "cliente"
    res.status(201).json({ ok: true });
  })
);

router.get('/me', requireAuth, (req, res) => res.json(publicUser(req.user)));

export default router;
