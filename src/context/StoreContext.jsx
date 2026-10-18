import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { readJSON, writeJSON } from '../lib/storage';

const CART_KEY = 'storego_cart';
const MAX_QTY = 99;

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  // Los productos viven en MySQL. El carrito es temporal y se queda en el navegador hasta finalizar la compra.
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [cart, setCart] = useState(() => readJSON(CART_KEY, []));
  const [toast, setToast] = useState({ message: '', show: false });
  const toastTimer = useRef(null);

  useEffect(() => {
    writeJSON(CART_KEY, cart);
  }, [cart]);

  const refreshProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      setProducts(await api('/productos'));
      setProductsError('');
    } catch (err) {
      setProductsError(err.message);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const showToast = useCallback(message => {
    clearTimeout(toastTimer.current);
    setToast({ message, show: true });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2200);
  }, []);

  /* ---------- Productos (CRUD que usa el panel de administración) ---------- */
  // Devuelven { ok: true, product } o { ok: false, message }.
  const addProduct = useCallback(async data => {
    try {
      const product = await api('/productos', { method: 'POST', body: data });
      setProducts(list => [...list, product]);
      return { ok: true, product };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }, []);

  const updateProduct = useCallback(async (id, data) => {
    try {
      const product = await api(`/productos/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
      setProducts(list => list.map(p => (p.id === id ? product : p)));
      return { ok: true, product };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }, []);

  const removeProduct = useCallback(async id => {
    try {
      await api(`/productos/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setProducts(list => list.filter(p => p.id !== id));
      // Si estaba en el carrito, también se quita (los pedidos ya hechos conservan su copia).
      setCart(c => c.filter(i => i.id !== id));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }, []);

  /* ---------- Carrito ---------- */
  const addToCart = useCallback(
    (id, qty = 1) => {
      const product = products.find(p => p.id === id);
      if (!product) return;
      setCart(c => {
        const item = c.find(i => i.id === id);
        return item
          ? c.map(i => (i.id === id ? { ...i, qty: Math.min(MAX_QTY, i.qty + qty) } : i))
          : [...c, { id, qty: Math.min(MAX_QTY, qty) }];
      });
      showToast(qty > 1 ? `${qty} × ${product.name} añadidos al carrito` : `${product.name} añadido al carrito`);
    },
    [products, showToast]
  );

  const removeFromCart = useCallback(id => setCart(c => c.filter(i => i.id !== id)), []);

  const changeQty = useCallback(
    (id, delta) =>
      setCart(c =>
        c.map(i => (i.id === id ? { ...i, qty: Math.min(MAX_QTY, i.qty + delta) } : i)).filter(i => i.qty > 0)
      ),
    []
  );

  const clearCart = useCallback(() => setCart([]), []);

  // Solo líneas cuyo producto aún existe (un producto borrado por el admin no rompe el carrito).
  const cartLines = useMemo(
    () => cart.map(i => ({ ...i, product: products.find(p => p.id === i.id) })).filter(l => l.product),
    [cart, products]
  );
  const cartCount = cartLines.reduce((sum, l) => sum + l.qty, 0);
  const cartTotal = cartLines.reduce((sum, l) => sum + l.qty * l.product.price, 0);

  /* ---------- Pedidos ---------- */
  // El servidor toma el cliente de la sesión y el nombre y precio de cada producto desde MySQL.
  const placeOrder = useCallback(async () => {
    if (cartLines.length === 0) return { ok: false, message: 'Tu carrito está vacío' };
    try {
      const order = await api('/pedidos', {
        method: 'POST',
        body: { items: cartLines.map(l => ({ id: l.id, qty: l.qty })) }
      });
      setCart([]);
      return { ok: true, order };
    } catch (err) {
      refreshProducts(); // por si algún producto cambió o se eliminó
      return { ok: false, message: err.message };
    }
  }, [cartLines, refreshProducts]);

  const value = {
    products,
    productsLoading,
    productsError,
    refreshProducts,
    addProduct,
    updateProduct,
    removeProduct,
    cartLines,
    cartCount,
    cartTotal,
    addToCart,
    removeFromCart,
    changeQty,
    clearCart,
    placeOrder,
    toast,
    showToast
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
