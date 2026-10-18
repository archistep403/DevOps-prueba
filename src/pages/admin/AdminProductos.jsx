import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useForm } from '../../lib/useForm';
import { PRODUCT_RULES } from '../../lib/validators';
import { fileToDataUrl, MAX_GALLERY, PLACEHOLDER_IMG } from '../../lib/products';
import { formatCLP } from '../../lib/format';
import Field from '../../components/Field';

const EMPTY = { name: '', desc: '', price: '' };

export default function AdminProductos() {
  const { products, addProduct, updateProduct, removeProduct, showToast } = useStore();
  const form = useForm(EMPTY, PRODUCT_RULES);
  const [editingId, setEditingId] = useState(null); // null = agregando; id = editando
  const [currentImg, setCurrentImg] = useState('');  // imagen actual del producto en edición
  const [image, setImage] = useState('');            // data URL de una imagen nueva subida
  const [imageUrl, setImageUrl] = useState('');      // o una URL / ruta escrita a mano
  const [imageError, setImageError] = useState('');
  const [gallery, setGallery] = useState([]);        // fotos extra de la galería del producto
  const [galleryError, setGalleryError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const galleryRef = useRef(null);
  const formRef = useRef(null);
  const editing = editingId !== null;

  const clearImageInputs = () => {
    setImage('');
    setImageUrl('');
    setImageError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = async e => {
    const file = e.target.files[0];
    setImageError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('El archivo debe ser una imagen');
      e.target.value = '';
      return;
    }
    try {
      setImage(await fileToDataUrl(file));
      setImageUrl('');
    } catch (err) {
      setImageError(err.message);
    }
  };

  const handleGallery = async e => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setGalleryError('');
    if (files.length === 0) return;
    const room = MAX_GALLERY - gallery.length;
    if (room <= 0) {
      setGalleryError(`Máximo ${MAX_GALLERY} fotos en la galería`);
      return;
    }
    const valid = files.filter(f => f.type.startsWith('image/'));
    const accepted = valid.slice(0, room);
    try {
      // Más pequeñas que la principal para que quepan varias en el almacenamiento.
      const urls = await Promise.all(accepted.map(f => fileToDataUrl(f, 720, 0.75)));
      setGallery(g => [...g, ...urls]);
    } catch (err) {
      setGalleryError(err.message);
      return;
    }
    if (valid.length < files.length) setGalleryError('Se ignoraron archivos que no son imágenes');
    else if (valid.length > room) setGalleryError(`Solo se agregaron ${room}: el máximo es ${MAX_GALLERY} fotos`);
  };

  const removeGalleryImage = i => setGallery(g => g.filter((_, idx) => idx !== i));

  const startEdit = product => {
    setEditingId(product.id);
    setCurrentImg(product.img);
    setGallery(product.gallery || []);
    setGalleryError('');
    setConfirmId(null);
    clearImageInputs();
    form.load({ name: product.name, desc: product.desc, price: String(product.price) });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCurrentImg('');
    setGallery([]);
    setGalleryError('');
    clearImageInputs();
    form.reset();
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (saving) return;
    if (!form.validateAll()) {
      showToast('Revisa los campos marcados en rojo');
      return;
    }
    const data = {
      name: form.values.name.trim(),
      desc: form.values.desc.trim(),
      price: form.values.price,
      // En edición se conserva la imagen actual salvo que se haya elegido otra.
      img: image || imageUrl.trim() || (editing ? currentImg : '') || PLACEHOLDER_IMG,
      gallery
    };
    setSaving(true);
    const result = editing ? await updateProduct(editingId, data) : await addProduct(data);
    setSaving(false);
    if (!result.ok) {
      showToast(result.message);
      return;
    }
    showToast(editing ? `"${result.product.name}" actualizado` : `"${result.product.name}" agregado a la tienda`);
    cancelEdit();
  };

  const handleRemove = async product => {
    const result = await removeProduct(product.id);
    setConfirmId(null);
    if (!result.ok) {
      showToast(result.message);
      return;
    }
    if (editingId === product.id) cancelEdit();
    showToast(`"${product.name}" eliminado`);
  };

  const preview = image || imageUrl.trim() || (editing ? currentImg : '');

  return (
    <>
      <h1>Productos</h1>
      <p className="admin-lead">Agrega, edita o quita productos. Los cambios se ven al instante en la tienda.</p>

      <div className="admin-columns">
        <form ref={formRef} className={`auth-card admin-form${editing ? ' editing' : ''}`} onSubmit={handleSubmit} noValidate>
          <h2>{editing ? 'Editar producto' : 'Agregar producto'}</h2>
          <div className="form-grid single">
            <Field form={form} name="name" label="Nombre" placeholder="Ej: Control DualSense" />
            <Field form={form} name="desc" label="Descripción" as="textarea" rows="3"
              placeholder="Ej: Control inalámbrico para PS5" hint="Máximo 200 caracteres" />
            <Field form={form} name="price" label="Precio (CLP)" type="number" min="1" step="1"
              placeholder="Ej: 59990" />
            <div className="form-field">
              <label htmlFor="imageFile">{editing ? 'Cambiar imagen (opcional)' : 'Imagen'}</label>
              <input id="imageFile" type="file" accept="image/*" ref={fileRef} onChange={handleFile} />
              <small className="field-hint">O pega una URL / ruta (ej: /img/ps5.avif)</small>
              <input type="text" value={imageUrl} placeholder="https://..."
                onChange={e => {
                  setImageUrl(e.target.value);
                  if (e.target.value) { setImage(''); if (fileRef.current) fileRef.current.value = ''; }
                }} />
              <small className="field-error">{imageError}</small>
            </div>
            <div className="form-field">
              <label htmlFor="galleryFiles">Galería de fotos ({gallery.length}/{MAX_GALLERY})</label>
              <input id="galleryFiles" type="file" accept="image/*" multiple ref={galleryRef} onChange={handleGallery}
                disabled={gallery.length >= MAX_GALLERY} />
              <small className="field-hint">Puedes elegir varias a la vez. Se muestran junto a la imagen principal.</small>
              {gallery.length > 0 && (
                <ul className="admin-gallery">
                  {gallery.map((src, i) => (
                    <li key={i}>
                      <img src={src} alt={`Foto ${i + 1} de la galería`}
                        onError={e => { e.currentTarget.src = PLACEHOLDER_IMG; }} />
                      <button type="button" onClick={() => removeGalleryImage(i)} aria-label={`Quitar foto ${i + 1}`}>×</button>
                    </li>
                  ))}
                </ul>
              )}
              <small className="field-error">{galleryError}</small>
            </div>
            {preview && (
              <div className="form-field">
                <label>Vista previa</label>
                <img className="admin-preview" src={preview} alt="Vista previa"
                  onError={e => { e.currentTarget.src = PLACEHOLDER_IMG; }} />
              </div>
            )}
          </div>
          <div className="auth-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar producto'}
            </button>
            {editing && <button type="button" className="btn btn-ghost" onClick={cancelEdit}>Cancelar edición</button>}
          </div>
        </form>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Productos en la tienda ({products.length})</h2>
          </div>

          {products.length === 0 ? (
            <p className="carrito-vacio">No hay productos. Agrega el primero con el formulario.</p>
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} className={editingId === p.id ? 'row-editing' : ''}>
                      <td>
                        <div className="admin-product-cell">
                          <img src={p.img || PLACEHOLDER_IMG} alt="" />
                          <div>
                            <Link to={`/productos/${p.id}`} className="admin-product-name">{p.name}</Link>
                            <small>{p.desc}</small>
                            {(p.gallery?.length || 0) > 0 && (
                              <small className="photo-count">{p.gallery.length + 1} fotos</small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="nowrap">{formatCLP(p.price)}</td>
                      <td className="actions">
                        {confirmId === p.id ? (
                          <>
                            <button className="btn-danger" onClick={() => handleRemove(p)}>Confirmar</button>
                            <button className="btn-link" onClick={() => setConfirmId(null)}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button className="btn-edit" onClick={() => startEdit(p)}>Editar</button>
                            <button className="btn-danger-ghost" onClick={() => setConfirmId(p.id)}>Quitar</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
