import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { useFetch } from '../lib/useFetch';
import { formatCLP } from '../lib/format';
import { formatDate, orderHistory, statusLabel, TRACKING_STEPS } from '../lib/orders';
import { PLACEHOLDER_IMG } from '../lib/products';

// Línea de tiempo del pedido: pasos completados, paso actual y pasos pendientes.
function Tracking({ order }) {
  const history = orderHistory(order);
  const dateOf = estado => history.find(h => h.estado === estado)?.fecha;

  if (order.estado === 'cancelado') {
    return (
      <div className="track-cancelled">
        <span className="status-badge status-cancelado">Cancelado</span>
        <small>{formatDate(dateOf('cancelado') || order.fecha)} · Este pedido fue cancelado.</small>
      </div>
    );
  }

  const current = TRACKING_STEPS.findIndex(s => s.value === order.estado);
  return (
    <ol className="track">
      {TRACKING_STEPS.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        const date = dateOf(step.value);
        return (
          <li key={step.value} className={`track-step ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="track-dot" aria-hidden="true">{state === 'todo' ? '' : '✓'}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{date && state !== 'todo' ? formatDate(date) : state === 'current' ? step.hint : 'Pendiente'}</small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function MisPedidos() {
  const { products } = useStore();
  const { data, loading, error } = useFetch('/pedidos/mios', { interval: 30000 });
  const location = useLocation();
  const highlight = location.state?.highlight;
  const [openId, setOpenId] = useState(highlight || null);

  useEffect(() => {
    document.title = 'StoreGo | Mis pedidos';
  }, []);

  const mine = useMemo(() => [...(data || [])].sort((a, b) => b.fecha.localeCompare(a.fecha)), [data]);

  // Abre por defecto el pedido recién hecho o, si no hay, el más reciente.
  useEffect(() => {
    if (openId === null && mine.length > 0) setOpenId(mine[0].id);
  }, [mine, openId]);

  return (
    <section className="products">
      <div className="container">
        <span className="eyebrow">STOREGO MARKET</span>
        <h2 className="section-title">Mis pedidos</h2>
        <p className="track-lead">Sigue el estado de tus compras en tiempo real.</p>

        {loading && !data ? (
          <p className="carrito-vacio">Cargando tus pedidos…</p>
        ) : error && !data ? (
          <p className="carrito-vacio">{error}</p>
        ) : mine.length === 0 ? (
          <p className="carrito-vacio">
            Aún no tienes pedidos. <Link to="/productos">Ver productos</Link>
          </p>
        ) : (
          <div className="orders-list">
            {mine.map(o => {
              const open = openId === o.id;
              return (
                <article key={o.id} className={`order-card${o.id === highlight ? ' highlight' : ''}`}>
                  <button className="order-head" onClick={() => setOpenId(open ? '' : o.id)} aria-expanded={open}>
                    <span>
                      <strong>{o.id}</strong>
                      <small>{formatDate(o.fecha)}</small>
                    </span>
                    <span className={`status-badge status-${o.estado}`}>{statusLabel(o.estado)}</span>
                    <strong className="order-total">{formatCLP(o.total)}</strong>
                    <span className="order-chevron" aria-hidden="true">{open ? '▲' : '▼'}</span>
                  </button>

                  {open && (
                    <div className="order-body">
                      <Tracking order={o} />
                      <ul className="order-lines">
                        {o.items.map(i => {
                          const product = products.find(p => p.id === i.id);
                          return (
                            <li key={i.id}>
                              <img src={product?.img || PLACEHOLDER_IMG} alt="" />
                              <span>
                                {product ? <Link to={`/productos/${i.id}`}>{i.name}</Link> : i.name}
                                <small>{i.qty} × {formatCLP(i.price)}</small>
                              </span>
                              <strong>{formatCLP(i.qty * i.price)}</strong>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
