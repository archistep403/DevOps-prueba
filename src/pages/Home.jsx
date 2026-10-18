import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import ProductGrid from '../components/ProductGrid';
import { isAllowedEmail } from '../lib/validators';
import { useState } from 'react';

const CATEGORIES = [
  { icon: '🎮', name: 'Consolas' },
  { icon: '🕹️', name: 'Controles' },
  { icon: '💽', name: 'Videojuegos' },
  { icon: '🏷️', name: 'Ofertas' }
];

export default function Home() {
  const { products, showToast } = useStore();
  const [email, setEmail] = useState('');

  const handleSubscribe = e => {
    e.preventDefault();
    if (!isAllowedEmail(email.trim())) {
      showToast('Usa un correo @gmail.com, @duoc.cl o @profesor.duoc.cl');
      return;
    }
    showToast('¡Gracias por suscribirte!');
    setEmail('');
  };

  return (
    <>
      <section className="hero">
        <div className="hero-grid"></div>
        <div className="container hero-inner">
          <span className="eyebrow">CONSOLAS Y VIDEOJUEGOS</span>
          <h1>Encuentra tu próxima <span className="grad-text">consola</span></h1>
          <p className="hero-copy">La mejor tienda pa comprar :DDD</p>
          <div className="hero-actions">
            <Link to="/productos" className="btn btn-primary">Ver productos</Link>
            <Link to="/contacto" className="btn btn-ghost">Contáctanos</Link>
          </div>
        </div>
      </section>

      <section className="categories">
        <div className="container">
          <h2 className="section-title">Categorías</h2>
          <div className="cat-grid">
            {CATEGORIES.map(c => (
              <div className="cat-card" key={c.name}>
                <span className="cat-icon">{c.icon}</span>
                <h3>{c.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="products">
        <div className="container">
          <h2 className="section-title">Destacados</h2>
          <ProductGrid products={products} />
        </div>
      </section>

      <section className="newsletter">
        <div className="container newsletter-inner">
          <div>
            <h2>No te pierdas las ofertas</h2>
            <p>Suscríbete y recibe descuentos exclusivos.</p>
          </div>
          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="tu@correo.com"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">Suscribirme</button>
          </form>
        </div>
      </section>
    </>
  );
}
