import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, clearToken, getToken, setToken, UNAUTHORIZED_EVENT } from '../lib/api';
import { readJSON, removeKey, writeJSON } from '../lib/storage';

const SESSION_KEY = 'storego_session';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // La copia guardada solo evita parpadeos al recargar; quien manda es el servidor (/auth/me).
  const [session, setSession] = useState(() => (getToken() ? readJSON(SESSION_KEY, null) : null));
  const [ready, setReady] = useState(() => !getToken());

  const clearSession = useCallback(() => {
    clearToken();
    removeKey(SESSION_KEY);
    setSession(null);
  }, []);

  useEffect(() => {
    if (!getToken()) return undefined;
    let alive = true;
    api('/auth/me')
      .then(user => {
        if (!alive) return;
        writeJSON(SESSION_KEY, user);
        setSession(user);
      })
      .catch(err => {
        if (alive && err.status === 401) clearSession();
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [clearSession]);

  // Si el servidor responde 401 (token vencido), se cierra la sesión.
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, clearSession);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, clearSession);
  }, [clearSession]);

  // Lanza ApiError si las credenciales son incorrectas o no hay conexión.
  const login = useCallback(async (email, password) => {
    const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    setToken(token);
    writeJSON(SESSION_KEY, user);
    setSession(user);
    setReady(true);
    return user;
  }, []);

  const logout = useCallback(() => clearSession(), [clearSession]);

  // Ambas devuelven { ok: true } o { ok: false, field, message } (por ejemplo, correo o RUN repetido).
  const submitUser = async (path, user, auth) => {
    try {
      await api(path, { method: 'POST', body: user, auth });
      return { ok: true };
    } catch (err) {
      return { ok: false, field: err.field, message: err.message };
    }
  };
  const registerUser = useCallback(user => submitUser('/auth/register', user, false), []);
  const createUser = useCallback(user => submitUser('/usuarios', user, true), []);

  return (
    <AuthContext.Provider value={{ session, ready, login, logout, registerUser, createUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
