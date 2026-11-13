import { useId, useRef, useState } from 'react';
import { actualizarStockProducto } from '../utils/guardarProducto';
import { validarStock } from '../utils/productoForm';
import { clasificarErrorAdmin } from '../utils/errorAdmin';

/** Edición rápida del stock de un producto (no hay PATCH: se relee el producto y se reenvía completo). */
export default function ModalStock({ producto, onGuardado, onCancelar, onRefrescar }) {
  const idCampo = useId();
  const [valor, setValor] = useState(String(producto.stock));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (enCurso.current) return;
    const invalido = validarStock(valor);
    if (invalido) {
      setError(invalido);
      return;
    }
    enCurso.current = true;
    setGuardando(true);
    setError('');
    try {
      onGuardado(await actualizarStockProducto(producto.id, valor), 'stock');
    } catch (err) {
      const caso = clasificarErrorAdmin(err);
      setError(caso.campos.stock ?? caso.mensaje);
      if (caso.tipo === 'no-existe' || caso.tipo === 'sin-confirmar') onRefrescar?.();
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  };

  return (
    <div className="modal modal-backdrop-custom fade show d-block" tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered modal-sm" role="dialog" aria-modal="true" aria-label="Editar stock">
        <div className="modal-content rounded-1 border-0 shadow">
          <form onSubmit={enviar} noValidate>
            <div className="modal-body p-3">
              <h5 className="admin-modal-title mb-1">Editar stock</h5>
              <p className="admin-muted small mb-3">{producto.nombre} <span className="admin-mono">#{producto.sku}</span></p>
              <label htmlFor={idCampo} className="form-label admin-label mb-1">Stock disponible *</label>
              <input
                id={idCampo}
                type="number"
                min="0"
                className={`form-control form-control-sm rounded-1 admin-mono${error ? ' is-invalid' : ''}`}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
              {error && <div className="invalid-feedback d-block" role="alert">{error}</div>}
            </div>
            <div className="modal-footer admin-modal-foot border-top py-2 px-3">
              <button type="button" className="btn btn-sm btn-outline-secondary rounded-1" onClick={onCancelar} disabled={guardando}>Cancelar</button>
              <button type="submit" className="btn btn-ambar admin-btn-strong btn-sm rounded-1 px-3" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar stock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
