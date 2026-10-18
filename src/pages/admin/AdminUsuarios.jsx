import { Fragment, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { api } from '../../lib/api';
import { useFetch } from '../../lib/useFetch';
import { formatCLP } from '../../lib/format';
import { formatDate, statusLabel, sumSales } from '../../lib/orders';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'cliente', label: 'Cliente' }
];

export default function AdminUsuarios() {
  const { session } = useAuth();
  const { showToast } = useStore();
  const usersQ = useFetch('/usuarios');
  const ordersQ = useFetch('/pedidos', { interval: 30000 });
  const users = useMemo(() => usersQ.data || [], [usersQ.data]);
  const orders = useMemo(() => ordersQ.data || [], [ordersQ.data]);
  const [query, setQuery] = useState('');
  const [openEmail, setOpenEmail] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const changeRole = async (user, rol) => {
    try {
      await api(`/usuarios/${user.id}/rol`, { method: 'PATCH', body: { rol } });
      usersQ.setData(list => list.map(x => (x.id === user.id ? { ...x, rol } : x)));
      showToast(`${user.nombre} ahora es ${ROLES.find(r => r.value === rol).label.toLowerCase()}`);
    } catch (err) {
      showToast(err.message);
    }
  };

  const removeUser = async user => {
    try {
      await api(`/usuarios/${user.id}`, { method: 'DELETE' });
      usersQ.setData(list => list.filter(x => x.id !== user.id));
      if (openEmail === user.email) setOpenEmail(null);
      showToast(`Usuario ${user.email} eliminado`);
    } catch (err) {
      showToast(err.message);
    }
    setConfirmId(null);
  };

  // Compras agrupadas por correo del cliente.
  const byUser = useMemo(() => {
    const map = new Map();
    orders.forEach(o => {
      const list = map.get(o.cliente.email) || [];
      list.push(o);
      map.set(o.cliente.email, list);
    });
    map.forEach(list => list.sort((a, b) => b.fecha.localeCompare(a.fecha)));
    return map;
  }, [orders]);

  const q = query.trim().toLowerCase();
  const rows = users.filter(u =>
    !q || `${u.nombre} ${u.apellidos} ${u.email}`.toLowerCase().includes(q)
  );

  return (
    <>
      <h1>Usuarios</h1>
      <p className="admin-lead">Listado de usuarios, sus compras, y la opción de cambiar su rol o eliminarlos.</p>

      <div className="admin-panel admin-section">
        <div className="admin-toolbar">
          <input type="search" placeholder="Buscar por nombre o correo" value={query}
            onChange={e => setQuery(e.target.value)} aria-label="Buscar usuarios" />
          <span className="toolbar-count">{rows.length} de {users.length} usuarios</span>
        </div>

        {usersQ.loading && !usersQ.data ? (
          <p className="carrito-vacio">Cargando usuarios…</p>
        ) : usersQ.error && !usersQ.data ? (
          <p className="carrito-vacio">{usersQ.error}</p>
        ) : rows.length === 0 ? (
          <p className="carrito-vacio">Ningún usuario coincide con la búsqueda.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Usuario</th><th>Rol</th><th>Compras</th><th>Total gastado</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map(u => {
                  const list = byUser.get(u.email) || [];
                  const open = openEmail === u.email;
                  const isMe = u.email === session.email;
                  return (
                    <Fragment key={u.id}>
                      <tr>
                        <td>
                          {u.nombre} {u.apellidos}
                          <small className="cell-sub">{u.email}</small>
                        </td>
                        <td>
                          {isMe ? (
                            <>
                              <span className="role-badge role-badge-sm">{u.rol}</span>
                              <small className="cell-sub">Tu cuenta</small>
                            </>
                          ) : (
                            <select className="status-select" value={u.rol} onChange={e => changeRole(u, e.target.value)}
                              aria-label={`Rol de ${u.email}`}>
                              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          )}
                        </td>
                        <td>{list.length}</td>
                        <td className="nowrap">{formatCLP(sumSales(list))}</td>
                        <td className="actions">
                          {list.length > 0 && (
                            <button className="btn-edit" onClick={() => setOpenEmail(open ? null : u.email)}>
                              {open ? 'Ocultar compras' : 'Ver compras'}
                            </button>
                          )}
                          {!isMe && (confirmId === u.id ? (
                            <>
                              <button className="btn-danger" onClick={() => removeUser(u)}>Confirmar</button>
                              <button className="btn-link" onClick={() => setConfirmId(null)}>Cancelar</button>
                            </>
                          ) : (
                            <button className="btn-danger-ghost" onClick={() => setConfirmId(u.id)}>Eliminar</button>
                          ))}
                        </td>
                      </tr>
                      {open && (
                        <tr className="user-orders-row">
                          <td colSpan="5">
                            <ul className="user-orders">
                              {list.map(o => (
                                <li key={o.id}>
                                  <strong>{o.id}</strong> · {formatDate(o.fecha)} ·{' '}
                                  <span className={`status-badge status-${o.estado}`}>{statusLabel(o.estado)}</span>
                                  <div>{o.items.map(i => `${i.qty} × ${i.name}`).join(', ')}</div>
                                  <div className="user-order-total">{formatCLP(o.total)}</div>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
