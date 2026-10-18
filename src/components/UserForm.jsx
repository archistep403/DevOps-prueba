import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useForm } from '../lib/useForm';
import { ADMIN_USER_RULES, REGISTER_RULES } from '../lib/validators';
import { REGIONES } from '../lib/regiones';
import Field from './Field';

const EMPTY = {
  run: '', nombre: '', apellidos: '', email: '', emailConfirm: '', password: '', passwordConfirm: '',
  fechaNacimiento: '', telefono: '', region: '', comuna: '', direccion: '', tipoUsuario: ''
};

// Sirve para el registro público (adminMode=false) y para "Nuevo usuario" del administrador.
export default function UserForm({ adminMode = false }) {
  const { registerUser, createUser } = useAuth();
  const { showToast } = useStore();
  const navigate = useNavigate();
  const form = useForm(EMPTY, adminMode ? ADMIN_USER_RULES : REGISTER_RULES);
  const region = REGIONES.find(r => r.nombre === form.values.region);

  const handleRegionChange = e => form.setFields({ region: e.target.value, comuna: '' });

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.validateAll()) {
      showToast('Revisa los campos marcados en rojo');
      return;
    }
    const v = form.values;
    const send = adminMode ? createUser : registerUser; // el administrador puede elegir el rol
    const result = await send({
      run: v.run.trim().toUpperCase(),
      nombre: v.nombre.trim(),
      apellidos: v.apellidos.trim(),
      email: v.email.trim().toLowerCase(),
      password: v.password,
      fechaNacimiento: v.fechaNacimiento,
      telefono: v.telefono.trim(),
      region: v.region,
      comuna: v.comuna,
      direccion: v.direccion.trim(),
      rol: adminMode ? v.tipoUsuario : 'cliente'
    });
    if (!result.ok) {
      if (result.field) {
        form.setFieldError(result.field, result.message);
        document.getElementById(result.field)?.focus();
      } else {
        showToast(result.message);
      }
      return;
    }
    if (adminMode) {
      showToast('Usuario creado correctamente');
      form.reset();
    } else {
      showToast('Cuenta creada, ahora inicia sesión');
      setTimeout(() => navigate('/login'), 1200);
    }
  };

  return (
    <form className="auth-card wide" onSubmit={handleSubmit} noValidate>
      {!adminMode && (
        <div className="auth-brand">
          <img src="/img/logo_tienda_transparent.png" alt="Logo StoreGo" className="auth-logo" />
          <h1>Registro de usuario</h1>
          <p className="auth-sub">Crea tu cuenta para comprar en StoreGo.</p>
        </div>
      )}
      <div className="form-grid">
        <Field form={form} name="run" label="RUN" autoComplete="off"
          hint="Sin puntos ni guion, de 7 a 9 caracteres. Ej: 111111111" />
        <Field form={form} name="fechaNacimiento" label="Fecha de nacimiento (opcional)" type="date" />
        <Field form={form} name="nombre" label="Nombre" autoComplete="given-name" />
        <Field form={form} name="apellidos" label="Apellidos" autoComplete="family-name" />
        <Field form={form} name="email" label="Correo" type="email" placeholder="correo@duoc.cl"
          autoComplete="email" hint="Solo @duoc.cl, @profesor.duoc.cl o @gmail.com" />
        <Field form={form} name="emailConfirm" label="Confirmar correo" type="email" autoComplete="off" />
        <Field form={form} name="password" label="Contraseña" type="password" autoComplete="new-password"
          hint="Entre 4 y 10 caracteres" />
        <Field form={form} name="passwordConfirm" label="Confirmar contraseña" type="password"
          autoComplete="new-password" />
        <Field form={form} name="telefono" label="Teléfono (opcional)" type="tel" placeholder="+56912345678" />
        {adminMode && (
          <Field form={form} name="tipoUsuario" label="Tipo de usuario" as="select" full>
            <option value="">-- Seleccione el tipo --</option>
            <option value="admin">Administrador</option>
            <option value="cliente">Cliente</option>
            <option value="vendedor">Vendedor</option>
          </Field>
        )}
        <div className="form-field">
          <label htmlFor="region">Región</label>
          <select id="region" name="region" value={form.values.region} onChange={handleRegionChange}
            onBlur={form.handleBlur} className={form.stateClass('region')}>
            <option value="">-- Seleccione la región --</option>
            {REGIONES.map(r => <option key={r.nombre} value={r.nombre}>{r.nombre}</option>)}
          </select>
          <small className="field-error">{form.errors.region}</small>
        </div>
        <div className="form-field">
          <label htmlFor="comuna">Comuna</label>
          <select id="comuna" name="comuna" value={form.values.comuna} onChange={form.handleChange}
            onBlur={form.handleBlur} disabled={!region} className={form.stateClass('comuna')}>
            <option value="">-- Seleccione la comuna --</option>
            {region && region.comunas.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <small className="field-error">{form.errors.comuna}</small>
        </div>
        <Field form={form} name="direccion" label="Dirección" full autoComplete="street-address"
          hint="Máximo 300 caracteres" />
      </div>
      <div className="auth-actions">
        <button type="submit" className="btn btn-primary">Registrar</button>
      </div>
    </form>
  );
}
