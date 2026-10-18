import { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { api } from '../../lib/api';
import { useFetch } from '../../lib/useFetch';
import { formatCLP, formatRun } from '../../lib/format';
import { formatDate, ORDER_STATUSES, statusLabel, sumSales } from '../../lib/orders';

export default function AdminPedidos() {
  const { showToast } = useStore();
  const { data, loading, error, setData } = useFetch('/pedidos', { interval: 20000 });
  const orders = useMemo(() => data || [], [data]);
  const [status, setStatus] = useState('todos');
  const [query, setQuery] = useState('');

  // El teléfono se guarda en cada pedido al momento de la compra.
  const phoneOf = o => o.cliente.telefono || '';

  const sorted = useMemo(() => [...orders].sort((a, b) => b.fecha.localeCompare(a.fecha)), [orders]);
  const visible = sorted.filter(o => {
    if (status !== 'todos' && o.estado !== status) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const run = o.cliente.run || '';
    return [o.id, o.cliente.nombre, o.cliente.email, phoneOf(o), run, formatRun(run)].some(v => v.toLowerCase().includes(q));
  });

  const handleStatus = async (order, estado) => {
    try {
      const updated = await api(`/pedidos/${order.id}/estado`, { method: 'PATCH', body: { estado } });
      setData(list => list.map(o => (o.id === updated.id ? updated : o)));
      showToast(`Pedido ${order.id}: ${statusLabel(estado).toLowerCase()}`);
    } catch (err) {
      showToast(err.message);
    }
  };

  return (
    <>
      <h1>Pedidos</h1>
      <p className="admin-lead">Compras realizadas por los usuarios de la tienda.</p>

      <div className="stat-grid">
        <div className="stat-card"><strong>{orders.length}</strong><span>Pedidos recibidos</span></div>
        <div className="stat-card">
          <strong>{orders.filter(o => o.estado === 'pendiente').length}</strong><span>Pendientes</span>
        </div>
        <div className="stat-card"><strong>{formatCLP(sumSales(orders))}</strong><span>Ventas (sin cancelados)</span></div>
      </div>

      <div className="admin-panel admin-section">
        <div className="admin-toolbar">
          <input type="search" placeholder="Buscar por pedido, nombre, RUT, correo o teléfono" value={query}
            onChange={e => setQuery(e.target.value)} aria-label="Buscar pedidos" />
          <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filtrar por estado">
            <option value="todos">Todos los estados</option>
            {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {loading && !data ? (
          <p className="carrito-vacio">Cargando pedidos…</p>
        ) : error && !data ? (
          <p className="carrito-vacio">{error}</p>
        ) : orders.length === 0 ? (
          <p className="carrito-vacio">Aún no hay compras. Aparecerán aquí cuando un usuario finalice su carrito.</p>
        ) : visible.length === 0 ? (
          <p className="carrito-vacio">Ningún pedido coincide con el filtro.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Pedido</th><th>Cliente</th><th>RUT</th><th>Teléfono</th><th>Productos</th><th>Total</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {visible.map(o => (
                  <tr key={o.id}>
                    <td className="nowrap">
                      {o.id}
                      <small className="cell-sub">{formatDate(o.fecha)}</small>
                    </td>
                    <td>
                      {o.cliente.nombre}
                      <small className="cell-sub">{o.cliente.email}</small>
                    </td>
                    <td className="nowrap">
                      {o.cliente.run ? formatRun(o.cliente.run) : <span className="no-phone">Sin RUT</span>}
                    </td>
                    <td className="nowrap">
                      {phoneOf(o) ? (
                        <a className="phone-link" href={`tel:${phoneOf(o)}`}>{phoneOf(o)}</a>
                      ) : (
                        <span className="no-phone">Sin teléfono</span>
                      )}
                    </td>
                    <td>
                      <ul className="order-items">
                        {o.items.map(i => (
                          <li key={i.id}>{i.qty} × {i.name} <span>({formatCLP(i.price)} c/u)</span></li>
                        ))}
                      </ul>
                    </td>
                    <td className="nowrap">{formatCLP(o.total)}</td>
                    <td>
                      <select className={`status-select status-${o.estado}`} value={o.estado}
                        onChange={e => handleStatus(o, e.target.value)} aria-label={`Estado del pedido ${o.id}`}>
                        {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
