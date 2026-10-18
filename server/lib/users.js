import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { HttpError } from './http.js';

// Inserta un usuario ya validado. El correo y el RUN son únicos en la base de datos.
export async function insertUser(u) {
  const hash = await bcrypt.hash(u.password, 10);
  try {
    const [result] = await pool.query(
      `INSERT INTO usuarios (run, nombre, apellidos, email, password_hash, fecha_nacimiento, telefono, region, comuna, direccion, rol)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.run, u.nombre, u.apellidos, u.email, hash, u.fechaNacimiento, u.telefono, u.region, u.comuna, u.direccion, u.rol]
    );
    return result.insertId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const key = /for key '([^']+)'/.exec(String(err.sqlMessage || ''))?.[1] || '';
      if (key.includes('uq_usuarios_run')) throw new HttpError(409, 'Este RUN ya está registrado', { field: 'run' });
      throw new HttpError(409, 'Este correo ya está registrado', { field: 'email' });
    }
    throw err;
  }
}
