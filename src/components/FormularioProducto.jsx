import { useRef, useState } from 'react';
import ImagenProductoUploader from './ImagenProductoUploader';
import { urlMedia } from '../api/media';
import { validarArchivoImagen } from '../api/imagenes';
import { CATEGORIAS_FORMULARIO, formularioDesdeProducto, formularioVacio, validarProducto } from '../utils/productoForm';
import { guardarProductoDesdeForm } from '../utils/guardarProducto';
import { clasificarErrorAdmin } from '../utils/errorAdmin';

/**
 * Alta y edición de un producto (modal). `producto` null = alta; con producto = edición (el SKU queda bloqueado).
 * Sube las imágenes por multipart, valida con las reglas del backend y muestra cada error junto a su campo.
 * Nunca reintenta sola: si no se pudo confirmar el guardado, avisa, refresca la lista y deja volver a intentar.
 */
export default function FormularioProducto({ producto = null, onGuardado, onCancelar, onRefrescar }) {
  const modo = producto ? 'editar' : 'crear';
  const [form, setForm] = useState(() => (producto ? formularioDesdeProducto(producto) : formularioVacio()));
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [archivoOferta, setArchivoOferta] = useState(null);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);

  const cambiar = (campo, valor) => setForm((previo) => ({ ...previo, [campo]: valor }));
  const clase = (campo, extra = '') => `form-control form-control-sm rounded-1 ${extra}${errores[campo] ? ' is-invalid' : ''}`;
  const errorDe = (campo) => errores[campo] && <div className="invalid-feedback">{errores[campo]}</div>;

  const enviar = async (e) => {
    e.preventDefault();
    if (enCurso.current) return;

    const nuevos = validarProducto(form);
    [[archivoImagen, 'imagenUrl'], [archivoOferta, 'imagenOfertaUrl']].forEach(([archivo, campo]) => {
      const mensaje = archivo ? validarArchivoImagen(archivo) : '';
      if (mensaje) nuevos[campo] = mensaje;
    });
    setErrores(nuevos);
    setErrorGeneral('');
    if (Object.keys(nuevos).length > 0) return;

    enCurso.current = true;
    setGuardando(true);
    try {
      const guardado = await guardarProductoDesdeForm({ modo, form, original: producto, archivoImagen, archivoOferta });
      onGuardado(guardado, modo);
    } catch (error) {
      const caso = clasificarErrorAdmin(error);
      setErrores(caso.campos);
      setErrorGeneral(caso.mensaje);
      if (caso.tipo === 'no-existe' || caso.tipo === 'sin-confirmar') onRefrescar?.();
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  };

  return (
    <div className="modal modal-backdrop-custom fade show d-block" tabIndex="-1">
      <div className="modal-dialog modal-lg modal-dialog-centered" role="dialog" aria-modal="true" aria-labelledby="titulo-form-producto">
        <div className="modal-content rounded-1 border-0 shadow">
          <div className="modal-header admin-modal-head border-bottom py-2 px-3">
            <h5 id="titulo-form-producto" className="modal-title admin-modal-title mb-0">
              {modo === 'editar' ? 'Editar Producto' : 'Agregar Nuevo Producto'}
            </h5>
            <button type="button" className="btn-close btn-close-sm" onClick={onCancelar} aria-label="Cerrar" disabled={guardando}></button>
          </div>

          <form onSubmit={enviar} noValidate>
            <div className="modal-body p-3">
              {errorGeneral && <div className="alert alert-danger py-2 small" role="alert">{errorGeneral}</div>}
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <label htmlFor="producto-sku" className="form-label admin-label mb-1">SKU *</label>
                  <input
                    id="producto-sku"
                    type="text"
                    className={clase('sku', 'admin-mono')}
                    value={form.sku}
                    disabled={modo === 'editar'}
                    onChange={(e) => cambiar('sku', e.target.value)}
                    maxLength={30}
                    required
                  />
                  {modo === 'editar' && <div className="form-text">El SKU no se puede modificar.</div>}
                  {errorDe('sku')}
                </div>

                <div className="col-12 col-md-8">
                  <label htmlFor="producto-nombre" className="form-label admin-label mb-1">Nombre del Producto *</label>
                  <input
                    id="producto-nombre"
                    type="text"
                    className={clase('nombre')}
                    placeholder="Ej: Taladro Percutor 20V Max XR"
                    value={form.nombre}
                    onChange={(e) => cambiar('nombre', e.target.value)}
                    required
                  />
                  {errorDe('nombre')}
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="producto-marca" className="form-label admin-label mb-1">Marca *</label>
                  <input
                    id="producto-marca"
                    type="text"
                    className={clase('marca')}
                    placeholder="Ej: DeWalt, Bosch, Makita..."
                    value={form.marca}
                    onChange={(e) => cambiar('marca', e.target.value)}
                    required
                  />
                  {errorDe('marca')}
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="producto-categoria" className="form-label admin-label mb-1">Categoría *</label>
                  <select
                    id="producto-categoria"
                    className={`form-select form-select-sm rounded-1${errores.categoria ? ' is-invalid' : ''}`}
                    value={form.categoria}
                    onChange={(e) => cambiar('categoria', e.target.value)}
                  >
                    {CATEGORIAS_FORMULARIO.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {errorDe('categoria')}
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="producto-precio" className="form-label admin-label mb-1">Precio Unitario (CLP) *</label>
                  <input
                    id="producto-precio"
                    type="number"
                    min="1"
                    step="1"
                    className={clase('precioVenta', 'admin-mono')}
                    placeholder="129990"
                    value={form.precioVenta}
                    onChange={(e) => cambiar('precioVenta', e.target.value)}
                    required
                  />
                  {errorDe('precioVenta')}
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="producto-stock" className="form-label admin-label mb-1">Stock Disponible *</label>
                  <input
                    id="producto-stock"
                    type="number"
                    min="0"
                    step="1"
                    className={clase('stock', 'admin-mono')}
                    placeholder="10"
                    value={form.stock}
                    onChange={(e) => cambiar('stock', e.target.value)}
                    required
                  />
                  {errorDe('stock')}
                </div>

                <div className="col-12 col-md-6">
                  <span className="form-label admin-label mb-1 d-block">Imagen del Producto (Opcional)</span>
                  <ImagenProductoUploader
                    archivo={archivoImagen}
                    onSeleccionar={setArchivoImagen}
                    onQuitar={() => setArchivoImagen(null)}
                    imagenActual={form.imagenUrl ? urlMedia(form.imagenUrl) : ''}
                  />
                  {!archivoImagen && form.imagenUrl && (
                    <div className="d-flex justify-content-end mt-2">
                      <button type="button" className="btn btn-sm btn-outline-secondary rounded-1 py-0 px-2" onClick={() => cambiar('imagenUrl', '')}>
                        Usar imagen por defecto
                      </button>
                    </div>
                  )}
                  {errores.imagenUrl && <div className="text-danger small mt-1" role="alert">{errores.imagenUrl}</div>}
                </div>

                <div className="col-12 col-md-6">
                  <span className="form-label admin-label mb-1 d-block">Imagen de Oferta (Opcional)</span>
                  <ImagenProductoUploader
                    archivo={archivoOferta}
                    onSeleccionar={setArchivoOferta}
                    onQuitar={() => setArchivoOferta(null)}
                    imagenActual={form.imagenOfertaUrl ? urlMedia(form.imagenOfertaUrl) : ''}
                  />
                  {!archivoOferta && form.imagenOfertaUrl && (
                    <div className="d-flex justify-content-end mt-2">
                      <button type="button" className="btn btn-sm btn-outline-secondary rounded-1 py-0 px-2" onClick={() => cambiar('imagenOfertaUrl', '')}>
                        Quitar imagen de oferta
                      </button>
                    </div>
                  )}
                  {errores.imagenOfertaUrl && <div className="text-danger small mt-1" role="alert">{errores.imagenOfertaUrl}</div>}
                </div>

                <div className="col-12">
                  <label htmlFor="producto-descripcion" className="form-label admin-label mb-1">Descripción</label>
                  <textarea
                    id="producto-descripcion"
                    className={`form-control form-control-sm rounded-1${errores.descripcion ? ' is-invalid' : ''}`}
                    rows="3"
                    placeholder="Descripción técnica del producto..."
                    value={form.descripcion}
                    onChange={(e) => cambiar('descripcion', e.target.value)}
                  ></textarea>
                  {errorDe('descripcion')}
                </div>
              </div>
            </div>

            <div className="modal-footer admin-modal-foot border-top py-2 px-3">
              <button type="button" className="btn btn-sm btn-outline-secondary rounded-1" onClick={onCancelar} disabled={guardando}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-ambar admin-btn-strong btn-sm rounded-1 px-3" disabled={guardando}>
                {guardando ? 'Guardando…' : modo === 'editar' ? 'Guardar Cambios' : 'Registrar Producto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
