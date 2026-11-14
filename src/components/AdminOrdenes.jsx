import { useMemo, useState } from 'react';
import InsigniaEstadoOrden from './InsigniaEstadoOrden';
import { formatearCLP } from '../utils/formato';
import {
  ESTADOS_ORDEN,
  etiquetaMetodoPago,
  formatearFechaOrden,
  puedeEliminarOrden,
  transicionesOrden
} from '../utils/estadosOrden';

/** Listado de órdenes del panel Admin: filtros en el cliente, detalle de boleta y acciones por estado. */
export default function AdminOrdenes({
  ordenes,
  ordenEnProcesoId = null,
  errorAccion = '',
  onLimpiarError,
  onVerBoleta,
  onCambiarEstado,
  onSolicitarCancelar,
  onSolicitarEliminar
}) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return ordenes.filter((ord) => {
      const coincideEstado = filtroEstado === 'TODOS' || ord.estado === filtroEstado;
      if (!coincideEstado) return false;
      if (!texto) return true;
      const campos = [
        ord.codigo,
        ord.boleta,
        ord.cliente?.nombre,
        ord.cliente?.email,
        ord.cliente?.rut
      ];
      return campos.some((c) => typeof c === 'string' && c.toLowerCase().includes(texto));
    });
  }, [ordenes, busqueda, filtroEstado]);

  return (
    <div className="admin-box p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom">
        <div>
          <h2 className="admin-section-title mb-0">Registro de Órdenes y Ventas</h2>
          <span className="admin-muted">Listado de transacciones registradas</span>
        </div>
        <span className="admin-badge-soft">
          {filtradas.length === ordenes.length
            ? `${ordenes.length} órdenes registradas`
            : `${filtradas.length} de ${ordenes.length} órdenes`}
        </span>
      </div>

      <div className="row g-2 align-items-center mb-3">
        <div className="col-12 col-md-6">
          <input
            type="text"
            className="form-control form-control-sm rounded-1"
            placeholder="Buscar por código, boleta o cliente..."
            aria-label="Buscar órdenes"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-4 col-lg-3">
          <select
            className="form-select form-select-sm rounded-1"
            aria-label="Filtrar por estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="TODOS">Todos los estados</option>
            {Object.entries(ESTADOS_ORDEN).map(([clave, info]) => (
              <option key={clave} value={clave}>{info.etiqueta}</option>
            ))}
          </select>
        </div>
      </div>

      {errorAccion && (
        <div className="alert alert-danger py-2 d-flex justify-content-between align-items-center mb-3" role="alert">
          <span>{errorAccion}</span>
          {onLimpiarError && (
            <button type="button" className="btn-close btn-close-sm" onClick={onLimpiarError} aria-label="Cerrar error"></button>
          )}
        </div>
      )}

      <div className="table-responsive">
        <table className="table admin-table align-middle mb-0">
          <thead>
            <tr>
              <th>N° Orden</th>
              <th>Fecha / Hora</th>
              <th>Cliente</th>
              <th>Dirección de Entrega</th>
              <th>Método de Pago</th>
              <th className="admin-ta-end">Total Pagado</th>
              <th>Estado</th>
              <th className="admin-ta-end">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan="8" className="admin-ta-center admin-muted py-4">
                  No se encontraron órdenes con los filtros aplicados.
                </td>
              </tr>
            ) : (
              filtradas.map((ord) => {
                const ocupada = ordenEnProcesoId === ord.id;
                const transiciones = transicionesOrden(ord.estado);
                const eliminable = puedeEliminarOrden(ord.estado);
                const direccion = ord.envio
                  ? `${ord.envio.direccion}, ${ord.envio.comuna}, ${ord.envio.region}`
                  : '—';
                return (
                  <tr key={ord.id} data-testid="fila-orden">
                    <td>
                      <div className="admin-cell-price">{ord.codigo}</div>
                      {ord.boleta && <div className="admin-order-email">{ord.boleta}</div>}
                    </td>
                    <td className="admin-muted">{formatearFechaOrden(ord.createdAt)}</td>
                    <td>
                      <div className="admin-cell-strong">{ord.cliente?.nombre ?? '—'}</div>
                      {ord.cliente?.email && <div className="admin-order-email">{ord.cliente.email}</div>}
                    </td>
                    <td className="admin-td-address admin-muted marca-truncar" title={direccion}>
                      {direccion}
                    </td>
                    <td className="admin-muted">{etiquetaMetodoPago(ord.metodoPago)}</td>
                    <td className="admin-ta-end admin-cell-price">{formatearCLP(ord.total)}</td>
                    <td>
                      <InsigniaEstadoOrden estado={ord.estado} />
                    </td>
                    <td className="admin-ta-end">
                      <div className="d-inline-flex flex-wrap justify-content-end gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark rounded-1 py-0 px-2"
                          onClick={() => onVerBoleta(ord)}
                        >
                          Ver Boleta
                        </button>
                        {transiciones.map((t) => (
                          <button
                            key={t.estado}
                            type="button"
                            className={`btn btn-sm btn-${t.variante} rounded-1 py-0 px-2`}
                            disabled={ocupada}
                            onClick={() => (t.requiereConfirmacion ? onSolicitarCancelar(ord) : onCambiarEstado(ord, t.estado))}
                          >
                            {t.etiqueta}
                          </button>
                        ))}
                        {eliminable && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger rounded-1 py-0 px-2"
                            disabled={ocupada}
                            onClick={() => onSolicitarEliminar(ord)}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

