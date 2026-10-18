import 'dotenv/config';
import crypto from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  isProd,
  port: Number(process.env.PORT) || 3001,
  // Número de proxies de confianza delante de la API (1 = el balanceador nginx de docker-compose).
  // Sin esto, express-rate-limit vería todas las peticiones con la IP del balanceador.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'storego'
  }
};

const EXAMPLE_SECRET = 'dev-secret-cambialo';
let jwtSecret = null;

// Clave con la que se firman las sesiones. En producción es obligatoria y no puede ser la del ejemplo.
export function getJwtSecret() {
  if (jwtSecret) return jwtSecret;
  const fromEnv = process.env.JWT_SECRET;
  if (isProd && (!fromEnv || fromEnv === EXAMPLE_SECRET)) {
    console.error('Define un JWT_SECRET propio (largo y aleatorio) en .env antes de usar NODE_ENV=production.');
    process.exit(1);
  }
  if (!fromEnv) {
    console.warn('[aviso] JWT_SECRET no está definido: se usa uno temporal y las sesiones se cierran al reiniciar la API.');
  }
  jwtSecret = fromEnv || crypto.randomBytes(32).toString('hex');
  return jwtSecret;
}
