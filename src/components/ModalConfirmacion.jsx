import { useId } from 'react';

/**
 * Confirmación de una acción delicada (borrar un producto, cancelar o borrar una orden...).
 * `mensaje` explica la consecuencia. Si la acción falla, `error` se muestra aquí mismo y el modal sigue abierto.
 */
export default function ModalConfirmacion({
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  variante = 'danger',
  procesando = false,
  error = '',
  onConfirmar,
  onCancelar
}) {
  const idTitulo = useId();
  return (
    <div className="modal modal-backdrop-custom fade show d-block" tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered" role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <div className="modal-content rounded-1 border-0 shadow">
          <div className="modal-body admin-ta-center p-4">
            <h5 id={idTitulo} className="admin-modal-title mb-2">{titulo}</h5>
            <div className="admin-muted mb-3">{mensaje}</div>
            {error && (
              <div className="alert alert-danger py-2 small" role="alert">{error}</div>
            )}
            <div className="d-flex justify-content-center gap-2">
              <button type="button" className="btn btn-sm btn-outline-secondary rounded-1 px-3" onClick={onCancelar} disabled={procesando}>
                Cancelar
              </button>
              <button type="button" className={`btn btn-sm btn-${variante} rounded-1 px-3`} onClick={onConfirmar} disabled={procesando}>
                {procesando ? 'Procesando…' : textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
