import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatCLP } from '../../lib/format';
import { useFetch } from '../../lib/useFetch';

export default function AdminDashboard() {
  const { session } = useAuth();
  const { data: r } = useFetch('/admin/resumen', { interval: 30000 });
  const n = key => (r ? r[key] : '…');
  return (
    <>
      <h1>¡HOLA {session.nombre}!</h1>
      <span className="role-badge">{session.rol}</span>
      <div className="stat-grid">
        <div className="stat-card"><strong>{n('productos')}</strong><span>Productos en la tienda</span></div>
        <div className="stat-card"><strong>{n('usuarios')}</strong><span>Usuarios registrados</span></div>
        <div className="stat-card"><strong>{n('pedidos')}</strong><span>Pedidos recibidos</span></div>
        <div className="stat-card">
          <strong>{n('pendientes')}</strong><span>Pedidos pendientes</span>
        </div>
        <div className="stat-card"><strong>{r ? formatCLP(r.ventas) : '…'}</strong><span>Ventas (sin cancelados)</span></div>
      </div>
      <div className="admin-actions">
        <Link to="/admin/productos" className="btn btn-primary">Administrar productos</Link>
        <Link to="/admin/pedidos" className="btn btn-ghost">Ver pedidos</Link>
        {session.rol === 'admin' && <Link to="/admin/usuarios" className="btn btn-ghost">Ver usuarios</Link>}
      </div>
    </>
  );
}
