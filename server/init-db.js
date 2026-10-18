// Crea la base de datos y las tablas, y carga los datos iniciales. Se puede ejecutar varias veces:
// solo crea lo que falta. Uso:  npm run db:init
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { database, ...conn } = config.db;

const PRODUCTOS = [
  ['ps5', 'PlayStation 5', 'Capacidad de almacenamiento: 825 GB', 900000, '/img/ps5.avif'],
  ['ps4', 'PlayStation 4', 'Capacidad de almacenamiento: 500 GB', 250000, '/img/ps4.webp'],
  ['ps3', 'PlayStation 3', 'Memoria interna: 160 GB HDD', 70000, '/img/ps3.jpg']
];

const USUARIOS = [
  { nombre: 'Administrador', apellidos: 'StoreGo', email: 'admin@duoc.cl', password: 'admin123', rol: 'admin' },
  { nombre: 'Vendedor', apellidos: 'StoreGo', email: 'vendedor@duoc.cl', password: 'vend123', rol: 'vendedor' }
];

async function main() {
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error('DB_NAME solo puede tener letras, números y guion bajo');
  }
  const db = await mysql.createConnection({ ...conn, multipleStatements: true, charset: 'utf8mb4_unicode_ci' });
  try {
    await db.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await db.query(`USE \`${database}\``);
    await db.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    console.log(`Tablas listas en la base de datos "${database}".`);

    // Migración: las bases creadas antes de esta versión no tienen pedidos.cliente_run.
    const [[{ n: tieneRun }]] = await db.query(
      `SELECT COUNT(*) AS n FROM information_schema.columns
        WHERE table_schema = ? AND table_name = 'pedidos' AND column_name = 'cliente_run'`,
      [database]
    );
    if (tieneRun === 0) {
      await db.query('ALTER TABLE pedidos ADD COLUMN cliente_run VARCHAR(9) NULL AFTER cliente_nombre');
      console.log('Migración: se agregó la columna pedidos.cliente_run.');
    }
    // Pedidos antiguos: se completa el RUN desde el usuario que los hizo (si aún existe y lo tiene).
    await db.query(
      `UPDATE pedidos p JOIN usuarios u ON u.id = p.usuario_id
          SET p.cliente_run = u.run
        WHERE p.cliente_run IS NULL AND u.run IS NOT NULL`
    );

    const [[{ n: productos }]] = await db.query('SELECT COUNT(*) AS n FROM productos');
    if (productos === 0) {
      await db.query('INSERT INTO productos (id, nombre, descripcion, precio, img) VALUES ?', [PRODUCTOS]);
      console.log(`Productos iniciales cargados (${PRODUCTOS.length}).`);
    }

    // Las cuentas de prueba solo se crean si todavía no existe ningún usuario.
    const [[{ n: usuarios }]] = await db.query('SELECT COUNT(*) AS n FROM usuarios');
    if (usuarios === 0) {
      const rows = [];
      for (const u of USUARIOS) {
        rows.push([u.nombre, u.apellidos, u.email, await bcrypt.hash(u.password, 10), u.rol]);
      }
      await db.query('INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol) VALUES ?', [rows]);
      console.log('Cuentas de prueba creadas: admin@duoc.cl / admin123 y vendedor@duoc.cl / vend123');
    }
  } finally {
    await db.end();
  }
}

main().catch(err => {
  if (err.code === 'ECONNREFUSED') {
    console.error(`No se pudo conectar a MySQL en ${conn.host}:${conn.port}. ¿Está encendido?`);
  } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('MySQL rechazó el usuario o la contraseña. Revisa DB_USER y DB_PASSWORD en .env');
  } else {
    console.error('Error al preparar la base de datos:', err.message);
  }
  process.exit(1);
});
