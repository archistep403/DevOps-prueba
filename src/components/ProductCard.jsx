import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { formatCLP } from '../lib/format';
import { PLACEHOLDER_IMG } from '../lib/products';

export default function ProductCard({ product }) {
  const { addToCart } = useStore();
  return (
    <div className="product-card">
      <Link to={`/productos/${product.id}`} className="product-thumb">
        <img src={product.img || PLACEHOLDER_IMG} alt={product.name} />
      </Link>
      <h3>
        <Link to={`/productos/${product.id}`}>{product.name}</Link>
      </h3>
      <p className="product-desc">{product.desc}</p>
      <div className="product-footer">
        <span className="price">{formatCLP(product.price)}</span>
        <button className="btn-add" onClick={() => addToCart(product.id)}>Añadir</button>
      </div>
    </div>
  );
}
