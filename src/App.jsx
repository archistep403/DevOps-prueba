import { Navigate, Route, Routes } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import AdminLayout from './components/AdminLayout';
import RequireRole from './components/RequireRole';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Productos from './pages/Productos';
import ProductoDetalle from './pages/ProductoDetalle';
import Carrito from './pages/Carrito';
import Contacto from './pages/Contacto';
import Login from './pages/Login';
import Registro from './pages/Registro';
import MisPedidos from './pages/MisPedidos';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProductos from './pages/admin/AdminProductos';
import AdminNuevoUsuario from './pages/admin/AdminNuevoUsuario';
import AdminPedidos from './pages/admin/AdminPedidos';
import AdminUsuarios from './pages/admin/AdminUsuarios';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/productos/:id" element={<ProductoDetalle />} />
          <Route path="/carrito" element={<Carrito />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route
            path="/mis-pedidos"
            element={
              <RequireRole roles={['admin', 'vendedor', 'cliente']}>
                <MisPedidos />
              </RequireRole>
            }
          />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireRole roles={['admin', 'vendedor']}>
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="productos" element={<AdminProductos />} />
          <Route path="pedidos" element={<AdminPedidos />} />
          <Route
            path="usuarios"
            element={
              <RequireRole roles={['admin']}>
                <AdminUsuarios />
              </RequireRole>
            }
          />
          <Route
            path="usuarios/nuevo"
            element={
              <RequireRole roles={['admin']}>
                <AdminNuevoUsuario />
              </RequireRole>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
