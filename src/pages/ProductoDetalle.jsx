import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import ProductGrid from '../components/ProductGrid';
import ProductGallery from '../components/ProductGallery';
import { formatCLP } from '../lib/format';

export default function ProductoDetalle() {
  const { id } = useParams();
  const { products, addToCart, productsLoading } = useStore();
  const [qty, setQty] = useState(1);
  const product = products.find(p => p.id === id);

  useEffect(() => {
    document.title = product ? `StoreGo | ${product.name}` : 'StoreGo | Producto';
    setQty(1);
  }, [product, id]);

  if (!product && productsLoading) {
    return (
      <section className="products">
        <div className="container">
          <p className="carrito-vacio">Cargando producto…</p>
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="products">
        <div className="container">
          <p className="carrito-vacio">
            Producto no encontrado. <Link to="/productos">Volver a productos</Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="products">
      <div className="container">
        <p className="breadcrumb">
          <Link to="/">Inicio</Link> › <Link to="/productos">Productos</Link> › <span>{product.name}</span>
        </p>
        <div className="detail-layout">
          <ProductGallery product={product} />
          <div className="detail-info">
            <h1>{product.name}</h1>
            <p className="detail-price">{formatCLP(product.price)}</p>
            <p className="detail-desc">{product.desc}</p>
            <div className="detail-qty">
              <label htmlFor="detailQty">Cantidad</label>
              <select id="detailQty" value={qty} onChange={e => setQty(parseInt(e.target.value, 10))}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={() => addToCart(product.id, qty)}>
              Añadir al carrito
            </button>
          </div>
        </div>
        <h2 className="related-title">Productos relacionados</h2>
        <ProductGrid products={products.filter(p => p.id !== product.id)} />
      </div>
    </section>
  );
}
