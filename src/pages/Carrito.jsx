import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { formatCLP } from '../lib/format';
import { PLACEHOLDER_IMG } from '../lib/products';

export default function Carrito() {
  const { cartLines, cartTotal, changeQty, removeFromCart, placeOrder, showToast } = useStore();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);

  const handleCheckout = async () => {
    if (placing) return;
    if (cartLines.length === 0) {
      showToast('Tu carrito está vacío');
      return;
    }
    if (!session) {
      showToast('Inicia sesión para finalizar tu compra');
      navigate('/login', { state: { from: '/carrito' } });
      return;
    }
    setPlacing(true);
    const result = await placeOrder(); // el servidor toma el cliente (y su teléfono) de la sesión
    setPlacing(false);
    showToast(result.ok ? `¡Compra realizada! Pedido ${result.order.id}` : result.message);
    if (result.ok) navigate('/mis-pedidos', { state: { highlight: result.order.id } });
  };

  return (
    <section className="products">
      <div className="container">
        <span className="eyebrow">STOREGO MARKET</span>
        <h2 className="section-title">Tu carrito</h2>
        <div className="carrito-layout">
          <div className="items-carrito">
            {cartLines.length === 0 && <p className="carrito-vacio">Tu carrito está vacío.</p>}
            {cartLines.map(({ id, qty, product }) => (
              <div className="carrito-item" key={id}>
                <img src={product.img || PLACEHOLDER_IMG} alt={product.name} />
                <div className="carrito-item-info">
                  <h3>{product.name}</h3>
                  <p>{formatCLP(product.price)} c/u</p>
                </div>
                <div className="qty-controls">
                  <button onClick={() => changeQty(id, -1)}>−</button>
                  <span>{qty}</span>
                  <button onClick={() => changeQty(id, 1)}>+</button>
                </div>
                <strong>{formatCLP(product.price * qty)}</strong>
                <button className="remove-item" onClick={() => removeFromCart(id)}>Quitar</button>
              </div>
            ))}
          </div>
          <aside className="resumen">
            <h2>Resumen</h2>
            <div className="resumen-linea">
              <span>Productos</span>
              <span>{formatCLP(cartTotal)}</span>
            </div>
            <div className="resumen-linea">
              <span>Envío</span>
              <span>GRATIS</span>
            </div>
            <hr />
            <div className="resumen-linea total">
              <span>Total</span>
              <strong>{formatCLP(cartTotal)}</strong>
            </div>
            <button className="btn btn-primary" id="finalizarCompra" onClick={handleCheckout} disabled={placing}>
              {placing ? 'Procesando…' : 'Finalizar compra'}
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}
