// Almacenamiento local del navegador. Ya NO guarda productos, pedidos ni usuarios (eso vive en MySQL);
// solo el carrito, el token de sesión y una copia de la sesión para pintar la interfaz sin parpadeo.
export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // por ejemplo, cuota llena
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* sin almacenamiento disponible */
  }
}
