import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4_unicode_ci',
  timezone: 'Z' // las fechas se guardan y se leen en UTC; el navegador las muestra en hora local
});

// Ejecuta fn dentro de una transacción. READ COMMITTED evita que la limpieza de imágenes
// huérfanas se confunda con cambios que otro administrador acaba de confirmar.
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* la conexión ya estaba caída */
    }
    throw err;
  } finally {
    conn.release();
  }
}
