import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Protege rutas según el rol de la sesión (equivalente a guardPage del JS original).
export default function RequireRole({ roles, children }) {
  const { session, ready } = useAuth();
  if (!ready) return null; // espera a que el servidor confirme la sesión guardada
  if (!session || !roles.includes(session.rol)) return <Navigate to="/login" replace />;
  return children;
}
