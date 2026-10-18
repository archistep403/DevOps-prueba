import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const [open, setOpen] = useState(false);
  const { cartCount } = useStore();
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const close = () => setOpen(false);

  const handleLogout = e => {
    e.preventDefault();
    close();
    logout();
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="scan-line"></div>
      <div className="container header-inner">
        <Link to="/" className="logo">
          <span>Store</span>Go
        </Link>
        <nav className={`nav${open ? ' open' : ''}`} id="mainNav">
          <NavLink to="/" end onClick={close}>Inicio</NavLink>
          <NavLink to="/productos" onClick={close}>Productos</NavLink>
          <NavLink to="/contacto" onClick={close}>Contacto</NavLink>
          {!session && (
            <>
              <Link className="auth-link" to="/login" onClick={close}>Iniciar sesión</Link>
              <Link className="auth-link" to="/registro" onClick={close}>Registrarse</Link>
            </>
          )}
          {session && (
            <NavLink to="/mis-pedidos" onClick={close}>Mis pedidos</NavLink>
          )}
          {session && session.rol !== 'cliente' && (
            <Link className="auth-link" to="/admin" onClick={close}>Panel</Link>
          )}
          {session && (
            <a className="auth-link" href="#" onClick={handleLogout}>Salir ({session.nombre})</a>
          )}
        </nav>
        <div className="header-actions">
          <Link to="/carrito" className="icon-btn" aria-label="Carrito">
            <img
              src={cartCount > 0 ? '/img/carrito_ocupado.png' : '/img/carrito_vacio.png'}
              alt="Carrito"
              className="cart-icon-img"
            />
            <span className="cart-count">{cartCount}</span>
          </Link>
          <button className="icon-btn" id="menuToggle" aria-label="Abrir menú" onClick={() => setOpen(o => !o)}>
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
