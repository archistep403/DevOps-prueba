export const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#1c1329"/><text x="50%" y="50%" fill="#a89bc4" font-family="sans-serif" font-size="20" text-anchor="middle" dominant-baseline="middle">Sin imagen</text></svg>'
  );

export const MAX_GALLERY = 6; // fotos extra por producto (además de la imagen principal)

// Todas las fotos de un producto: la principal primero y luego la galería, sin repetidas.
export function productImages(product) {
  const all = [product.img, ...(product.gallery || [])].filter(Boolean);
  return [...new Set(all)];
}

// Reduce la imagen subida por el administrador antes de enviarla al servidor (se guarda en MySQL).
export function fileToDataUrl(file, maxSize = 640, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
