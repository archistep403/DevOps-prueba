import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

// Carga un GET de la API. Con `interval` (ms) se refresca solo mientras la página está abierta.
// reload(true) refresca sin mostrar "cargando"; setData permite actualizar la lista tras un cambio.
export function useFetch(path, { interval = 0 } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const alive = useRef(true);

  const reload = useCallback(
    async (silent = false) => {
      if (!silent) setState(s => ({ ...s, loading: true }));
      try {
        const data = await api(path);
        if (alive.current) setState({ data, loading: false, error: '' });
      } catch (err) {
        if (alive.current) setState(s => ({ data: s.data, loading: false, error: err.message }));
      }
    },
    [path]
  );

  const setData = useCallback(updater => {
    setState(s => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  useEffect(() => {
    alive.current = true;
    reload();
    const timer = interval ? setInterval(() => reload(true), interval) : null;
    return () => {
      alive.current = false;
      if (timer) clearInterval(timer);
    };
  }, [reload, interval]);

  return { ...state, reload, setData };
}
