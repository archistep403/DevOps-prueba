import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { isAllowedEmail } from '../lib/validators';

export default function Contacto() {
  const { showToast } = useStore();
  const [form, setForm] = useState({ nombre: '', email: '', mensaje: '' });
  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = e => {
    e.preventDefault();
    if (!isAllowedEmail(form.email.trim())) {
      showToast('Usa un correo @gmail.com, @duoc.cl o @profesor.duoc.cl');
      return;
    }
    // Aquí se puede conectar el envío real (por ejemplo EmailJS).
    showToast('Mensaje enviado, te responderemos pronto.');
    setForm({ nombre: '', email: '', mensaje: '' });
  };

  return (
    <>
      <section className="hero">
        <div className="hero-grid"></div>
        <div className="container hero-inner">
          <span className="eyebrow">CONTACTO</span>
          <h1>¿Tienes una <span className="grad-text">pregunta</span>?</h1>
          <p className="hero-copy">Escríbenos y te respondemos a la brevedad.</p>
        </div>
      </section>
      <section className="products">
        <div className="container">
          <form className="contact-form" onSubmit={handleSubmit}>
            <input type="text" name="nombre" placeholder="Nombre" required value={form.nombre} onChange={set} />
            <input type="email" name="email" placeholder="Correo" required value={form.email} onChange={set} />
            <textarea name="mensaje" placeholder="Mensaje" rows="5" required value={form.mensaje} onChange={set} />
            <button type="submit" className="btn btn-primary">Enviar mensaje</button>
          </form>
        </div>
      </section>
    </>
  );
}
