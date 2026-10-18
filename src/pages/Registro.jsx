import { Link } from 'react-router-dom';
import UserForm from '../components/UserForm';

export default function Registro() {
  return (
    <section className="auth-section">
      <div className="container">
        <UserForm />
        <p className="auth-alt">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
      </div>
    </section>
  );
}
