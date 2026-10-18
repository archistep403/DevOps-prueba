import { useEffect, useState } from 'react';
import { PLACEHOLDER_IMG, productImages } from '../lib/products';

// Galería del detalle: foto grande + miniaturas, flechas y teclado (← →).
export default function ProductGallery({ product }) {
  const images = productImages(product);
  const [index, setIndex] = useState(0);
  const total = images.length;

  // Al cambiar de producto o si se quitaron fotos, vuelve a la primera.
  useEffect(() => setIndex(0), [product.id]);
  const safe = Math.min(index, Math.max(total - 1, 0));

  const go = delta => setIndex(i => (i + delta + total) % total);
  const onKeyDown = e => {
    if (total < 2) return;
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  };

  return (
    <div className="gallery" onKeyDown={onKeyDown}>
      <div className="detail-image">
        <img src={images[safe] || PLACEHOLDER_IMG} alt={`${product.name} — foto ${safe + 1} de ${Math.max(total, 1)}`}
          onError={e => { e.currentTarget.src = PLACEHOLDER_IMG; }} />
        {total > 1 && (
          <>
            <button type="button" className="gallery-nav prev" onClick={() => go(-1)} aria-label="Foto anterior">‹</button>
            <button type="button" className="gallery-nav next" onClick={() => go(1)} aria-label="Foto siguiente">›</button>
            <span className="gallery-count">{safe + 1} / {total}</span>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="gallery-thumbs" role="tablist" aria-label="Fotos del producto">
          {images.map((src, i) => (
            <button key={src.slice(-40) + i} type="button" role="tab" aria-selected={i === safe}
              className={i === safe ? 'active' : ''} onClick={() => setIndex(i)} aria-label={`Ver foto ${i + 1}`}>
              <img src={src} alt="" onError={e => { e.currentTarget.src = PLACEHOLDER_IMG; }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
