import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useForm } from '../lib/useForm';
import { LOGIN_RULES } from '../lib/validators';
import Field from '../components/Field';

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm({ email: '', password: '' }, LOGIN_RULES);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.validateAll()) {
      showToast('Revisa los campos marcados en rojo');
      return;
    }
    let user;
    try {
      user = await login(form.values.email.trim().toLowerCase(), form.values.password);
    } catch (err) {
      showToast(err.message);
      return;
    }
    showToast(`Bienvenido, ${user.nombre}`);
    const back = location.state?.from;
    setTimeout(() => navigate(back || (user.rol === 'cliente' ? '/' : '/admin')), 900);
  };

  return (
    <section className="auth-section">
      <div className="container">
        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <div className="auth-brand">
            <img src="/img/logo_tienda_transparent.png" alt="Logo StoreGo" className="auth-logo" />
            <h1>Iniciar sesión</h1>
            <p className="auth-sub">Ingresa con tu correo y contraseña.</p>
          </div>
          <div className="form-grid">
            <Field form={form} name="email" label="Correo" type="email" full placeholder="correo@duoc.cl"
              autoComplete="email" hint="Solo @duoc.cl, @profesor.duoc.cl o @gmail.com" />
            <Field form={form} name="password" label="Contraseña" type="password" full
              autoComplete="current-password" hint="Entre 4 y 10 caracteres" />
          </div>
          <div className="auth-actions">
            <button type="submit" className="btn btn-primary">Iniciar sesión</button>
          </div>
          <p className="auth-alt">¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
          <p className="demo-note">
            Cuentas de prueba: administrador <strong>admin@duoc.cl</strong> / <strong>admin123</strong> · vendedor{' '}
            <strong>vendedor@duoc.cl</strong> / <strong>vend123</strong>
          </p>
        </form>
      </div>
    </section>
  );
}
