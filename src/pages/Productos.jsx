import { useStore } from '../context/StoreContext';
import ProductGrid from '../components/ProductGrid';

export default function Productos() {
  const { products } = useStore();
  return (
    <section className="products">
      <div className="container">
        <h2 className="section-title">Todos los productos</h2>
        <ProductGrid products={products} />
      </div>
    </section>
  );
}
