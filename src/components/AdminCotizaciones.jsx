import { useMemo, useRef, useState } from 'react';
import {
  listarCotizaciones,
  actualizarCotizacion,
  eliminarCotizacion
} from '../api/cotizaciones';
import { useCarga } from '../hooks/useCarga';
import { clasificarErrorAdmin } from '../utils/errorAdmin';
import { formatearFechaOrden } from '../utils/estadosOrden';
import { IndicadorCarga } from './EsperarSesion';
import ErrorCarga from './ErrorCarga';
import ModalConfirmacion from './ModalConfirmacion';

const ESTADOS_COTIZACION = {
  PENDIENTE: { etiqueta: 'Pendiente', clase: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle' },
  EN_REVISION: { etiqueta: 'En revisión', clase: 'bg-primary-subtle text-primary border border-primary-subtle' },
  RESPONDIDA: { etiqueta: 'Respondida', clase: 'bg-success-subtle text-success border border-success-subtle' },
  CERRADA: { etiqueta: 'Cerrada', clase: 'bg-secondary-subtle text-secondary border border-secondary-subtle' }
};

/** Gestión de cotizaciones en el panel Admin (carga bajo demanda con filtro por estado). */
export default function AdminCotizaciones({ onNotificar }) {
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const { ultimos, cargando, error, recargar } = useCarga(
    () => listarCotizaciones(filtroEstado === 'TODOS' ? {} : { estado: filtroEstado }),
    `admin-cotizaciones-${filtroEstado}`
  );
  const cotizaciones = useMemo(() => ultimos ?? [], [ultimos]);

  // Modal detalle y gestión
  const [seleccionada, setSeleccionada] = useState(null);
  const [estadoEdit, setEstadoEdit] = useState('PENDIENTE');
  const [notaEdit, setNotaEdit] = useState('');
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);
  const [errorGestion, setErrorGestion] = useState('');

  // Confirmación eliminar
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  const eliminandoRef = useRef(false);

  const abrirDetalle = (cot) => {
    setSeleccionada(cot);
    setEstadoEdit(cot.estado || 'PENDIENTE');
    setNotaEdit(cot.notaAdmin ?? '');
    setErrorGestion('');
  };

  const guardarGestion = async (e) => {
    e.preventDefault();
    if (!seleccionada || guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    setErrorGestion('');
    try {
      await actualizarCotizacion(seleccionada.id, {
        estado: estadoEdit,
        notaAdmin: notaEdit
      });
      const codigo = seleccionada.codigo;
      setSeleccionada(null);
      recargar();
      onNotificar?.(`Cotización ${codigo} actualizada.`);
    } catch (err) {
      const caso = clasificarErrorAdmin(err);
      setErrorGestion(caso.mensaje);
      if (caso.tipo === 'no-existe' || caso.tipo === 'sin-confirmar') recargar();
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (!aEliminar || eliminandoRef.current) return;
    eliminandoRef.current = true;
    setEliminando(true);
    setErrorEliminar('');
    try {
      await eliminarCotizacion(aEliminar.id);
      const codigo = aEliminar.codigo;
      setAEliminar(null);
      recargar();
      onNotificar?.(`Cotización ${codigo} eliminada.`);
    } catch (err) {
      const caso = clasificarErrorAdmin(err);
      setErrorEliminar(caso.mensaje);
      if (caso.tipo === 'no-existe' || caso.tipo === 'sin-confirmar') recargar();
    } finally {
      eliminandoRef.current = false;
      setEliminando(false);
    }
  };

  if (cargando && ultimos === null) return <IndicadorCarga etiqueta="Cargando cotizaciones…" />;
  if (error && ultimos === null) {
    return <ErrorCarga error={error} onReintentar={recargar} titulo="No pudimos cargar las cotizaciones" />;
  }

  return (
    <div className="admin-box p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom">
        <div>
          <h2 className="admin-section-title mb-0">Bandeja de Cotizaciones</h2>
          <span className="admin-muted">Solicitudes de presupuesto por volumen y seguimiento comercial</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <select
            className="form-select form-select-sm rounded-1"
            aria-label="Filtrar cotizaciones por estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="TODOS">Todos los estados</option>
            {Object.entries(ESTADOS_COTIZACION).map(([clave, info]) => (
              <option key={clave} value={clave}>{info.etiqueta}</option>
            ))}
          </select>
          <span className="admin-badge-soft">{cotizaciones.length} cotizaciones</span>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table admin-table align-middle mb-0">
          <thead>
            <tr>
              <th>Código</th>
              <th>Fecha</th>
              <th>Solicitante</th>
              <th>Proyecto / Región</th>
              <th>Estado</th>
              <th className="admin-ta-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cotizaciones.length === 0 ? (
              <tr>
                <td colSpan="6" className="admin-ta-center admin-muted py-4">
                  No hay cotizaciones registradas para el filtro seleccionado.
                </td>
              </tr>
            ) : (
              cotizaciones.map((cot) => {
                const info = ESTADOS_COTIZACION[cot.estado] ?? {
                  etiqueta: cot.estado || 'Sin estado',
                  clase: 'bg-secondary-subtle text-secondary'
                };
                return (
                  <tr key={cot.id} data-testid="fila-cotizacion">
                    <td className="admin-cell-price">{cot.codigo}</td>
                    <td className="admin-muted">{formatearFechaOrden(cot.createdAt)}</td>
                    <td>
                      <div className="admin-cell-strong">{cot.nombre}</div>
                      <div className="admin-order-email">{cot.rut} · {cot.email}</div>
                    </td>
                    <td className="admin-muted">
                      <div>{cot.tipoProyecto}</div>
                      <div className="admin-order-email">{cot.region} · {cot.despachoObra ? 'Despacho a obra' : 'Retiro'}</div>
                    </td>
                    <td>
                      <span className={`badge ${info.clase}`}>{info.etiqueta}</span>
                    </td>
                    <td className="admin-ta-end">
                      <div className="d-inline-flex flex-wrap justify-content-end gap-1">
                        <button type="button" className="btn btn-sm btn-outline-dark rounded-1 py-0 px-2" onClick={() => abrirDetalle(cot)}>
                          Ver / Gestionar
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger rounded-1 py-0 px-2"
                          onClick={() => {
                            setErrorEliminar('');
                            setAEliminar(cot);
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Detalle y Gestión */}
      {seleccionada && (
        <div className="modal modal-backdrop-custom fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered" role="dialog" aria-modal="true">
            <div className="modal-content rounded-1 border-0 shadow">
              <div className="modal-header admin-modal-head border-bottom py-2 px-3">
                <h5 className="modal-title admin-modal-title mb-0">
                  Cotización {seleccionada.codigo}
                </h5>
                <button type="button" className="btn-close btn-close-sm" onClick={() => !guardando && setSeleccionada(null)}></button>
              </div>
              <form onSubmit={guardarGestion}>
                <div className="modal-body p-3">
                  <div className="admin-muted small mb-3 pb-2 border-bottom">
                    <div><strong>Solicitante:</strong> {seleccionada.nombre} ({seleccionada.rut})</div>
                    <div><strong>Contacto:</strong> {seleccionada.email} · {seleccionada.telefono}</div>
                    <div><strong>Proyecto:</strong> {seleccionada.tipoProyecto} | <strong>Región:</strong> {seleccionada.region}</div>
                    <div><strong>Despacho a obra:</strong> {seleccionada.despachoObra ? 'Sí' : 'No'} | <strong>Fecha:</strong> {formatearFechaOrden(seleccionada.createdAt)}</div>
                  </div>

                  <div className="mb-3">
                    <strong className="small d-block mb-1">Detalle solicitado:</strong>
                    <div className="p-2 bg-light border rounded-1 small">{seleccionada.detalle}</div>
                  </div>

                  {errorGestion && <div className="alert alert-danger py-2 small" role="alert">{errorGestion}</div>}

                  <div className="row g-2">
                    <div className="col-12 col-sm-4">
                      <label htmlFor="cot-estado" className="form-label small mb-1">Estado</label>
                      <select
                        id="cot-estado"
                        className="form-select form-select-sm rounded-1"
                        value={estadoEdit}
                        onChange={(e) => setEstadoEdit(e.target.value)}
                      >
                        {Object.entries(ESTADOS_COTIZACION).map(([clave, info]) => (
                          <option key={clave} value={clave}>{info.etiqueta}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-sm-8">
                      <label htmlFor="cot-nota" className="form-label small mb-1">Nota interna del administrador</label>
                      <textarea
                        id="cot-nota"
                        rows="3"
                        className="form-control form-control-sm rounded-1"
                        placeholder="Seguimiento, respuesta enviada o observaciones..."
                        value={notaEdit}
                        onChange={(e) => setNotaEdit(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer admin-modal-foot border-top py-2 px-3">
                  <button type="button" className="btn btn-sm btn-outline-secondary rounded-1" onClick={() => setSeleccionada(null)} disabled={guardando}>
                    Cerrar
                  </button>
                  <button type="submit" className="btn btn-sm btn-ambar admin-btn-strong rounded-1 px-3" disabled={guardando}>
                    {guardando ? 'Guardando…' : 'Guardar gestión'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {aEliminar && (
        <ModalConfirmacion
          titulo="¿Eliminar cotización?"
          mensaje={
            <>
              Se eliminará definitivamente la cotización <strong>{aEliminar.codigo}</strong> de <strong>{aEliminar.nombre}</strong>.
            </>
          }
          textoConfirmar="Eliminar"
          procesando={eliminando}
          error={errorEliminar}
          onConfirmar={confirmarEliminacion}
          onCancelar={() => setAEliminar(null)}
        />
      )}
    </div>
  );
}

