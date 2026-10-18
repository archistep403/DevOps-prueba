import { useStore } from '../context/StoreContext';
import ProductCard from './ProductCard';

export default function ProductGrid({ products }) {
  const { productsLoading, productsError, refreshProducts } = useStore();
  if (products.length === 0) {
    if (productsLoading) return <p className="carrito-vacio">Cargando productos…</p>;
    if (productsError) {
      return (
        <p className="carrito-vacio">
          {productsError} <button className="btn-link" onClick={refreshProducts}>Reintentar</button>
        </p>
      );
    }
    return <p className="carrito-vacio">No hay productos disponibles por ahora.</p>;
  }
  return (
    <div className="product-grid">
      {products.map(p => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
