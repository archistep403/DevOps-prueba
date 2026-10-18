// Cliente de la API de StoreGo (Express + MySQL). En desarrollo Vite redirige /api al servidor (vite.config.js).
const TOKEN_KEY = 'storego_token';
export const UNAUTHORIZED_EVENT = 'storego:unauthorized';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* sin almacenamiento disponible */
  }
}
export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* sin almacenamiento disponible */
  }
}

export class ApiError extends Error {
  constructor(message, status = 0, field) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.field = field;
  }
}

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin cuerpo JSON */
  }
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    const fallback = res.status >= 500 ? 'El servidor no responde. ¿Está encendida la API?' : `Error ${res.status}`;
    throw new ApiError(data?.message || fallback, res.status, data?.field);
  }
  return data;
}
