// Crea .env.docker a partir de .env.docker.example con contraseñas aleatorias.
// Funciona igual en Windows, macOS y Linux (evita `openssl`, `cp` y redirecciones de shell,
// que en PowerShell 5.1 guardan el archivo en UTF-16 y Docker Compose no puede leerlo).
// Uso:  npm run docker:env            (no sobrescribe si ya existe)
//       npm run docker:env -- --force (sobrescribe)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const example = path.join(root, '.env.docker.example');
const target = path.join(root, '.env.docker');

if (fs.existsSync(target) && !process.argv.includes('--force')) {
  console.log('.env.docker ya existe: no se modifica. Usa  npm run docker:env -- --force  para recrearlo.');
  process.exit(0);
}

const hex = bytes => crypto.randomBytes(bytes).toString('hex');
const content = fs
  .readFileSync(example, 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/^STOREGO_DB_PASSWORD=.*$/m, `STOREGO_DB_PASSWORD=${hex(16)}`)
  .replace(/^STOREGO_JWT_SECRET=.*$/m, `STOREGO_JWT_SECRET=${hex(32)}`);

fs.writeFileSync(target, content, { encoding: 'utf8' });
console.log('.env.docker creado con contraseñas aleatorias.');
