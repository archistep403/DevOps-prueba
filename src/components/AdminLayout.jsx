import { useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Toast from './Toast';

export default function AdminLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  // El CSS original aplica el layout del panel sobre body.admin-page.
  useEffect(() => {
    document.body.classList.add('admin-page');
    return () => document.body.classList.remove('admin-page');
  }, []);

  const handleLogout = e => {
    e.preventDefault();
    navigate('/');
    logout();
  };

  return (
    <>
      <aside className="admin-side">
        <Link to="/admin" className="logo"><span>Store</span>Go</Link>
        <NavLink to="/admin" end>Dashboard</NavLink>
        <NavLink to="/admin/productos">Productos</NavLink>
        <NavLink to="/admin/pedidos">Pedidos</NavLink>
        {session.rol === 'admin' && <NavLink to="/admin/usuarios" end>Usuarios</NavLink>}
        {session.rol === 'admin' && <NavLink to="/admin/usuarios/nuevo">Nuevo usuario</NavLink>}
        <Link to="/">Ver tienda</Link>
        <div className="spacer"></div>
        <a href="#" onClick={handleLogout}>Cerrar sesión</a>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
      <Toast />
    </>
  );
}
