import { useState } from 'react';
import { Link } from 'react-router-dom';
import { misOrdenes } from '../api/ordenes';
import { useCarga } from '../hooks/useCarga';
import { IndicadorCarga } from './EsperarSesion';
import ErrorCarga from './ErrorCarga';
import InsigniaEstadoOrden from './InsigniaEstadoOrden';
import { formatearCLP } from '../utils/formato';
import { etiquetaMetodoPago, formatearFechaOrden } from '../utils/estadosOrden';

/** Historial de compras del cliente, desde GET /ordenes/mis-ordenes (ya viene de la más reciente a la más antigua). */
export default function HistorialCompras() {
  const { datos: ordenes, cargando, error, recargar } = useCarga(misOrdenes, 'mis-ordenes');
  const [abiertas, setAbiertas] = useState(() => new Set());

  const alternar = (id) =>
    setAbiertas((previas) => {
      const nuevas = new Set(previas);
      if (nuevas.has(id)) nuevas.delete(id);
      else nuevas.add(id);
      return nuevas;
    });

  return (
    <div className="info-card shadow-sm p-4 p-md-5">
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom flex-wrap gap-2">
        <div>
          <h2 className="info-section-title mb-1">Historial de Compras Realizadas</h2>
          <span className="text-muted small">Registro de tus pedidos con boleta y despacho</span>
        </div>
        {ordenes && <span className="badge bg-dark px-3 py-2 font-monospace">Total Compras: {ordenes.length}</span>}
      </div>

      {cargando && <IndicadorCarga etiqueta="Cargando tus compras…" />}
      {error && <ErrorCarga error={error} onReintentar={recargar} titulo="No pudimos cargar tus compras" />}

      {ordenes && ordenes.length === 0 && (
        <div className="text-center py-5">
          <i className="bi bi-cart-x text-muted display-4 mb-3 d-block"></i>
          <h3 className="h5 text-dark mb-2">Aún no registras compras con tu cuenta</h3>
          <p className="text-secondary small mb-4">
            Explora nuestro catálogo con herramientas y materiales profesionales para comenzar tu primer pedido.
          </p>
          <Link to="/catalogo" className="btn btn-ambar px-4 py-2 rounded-1 fw-bold">
            Explorar Catálogo
          </Link>
        </div>
      )}

      {ordenes && ordenes.length > 0 && (
        <div className="d-flex flex-column gap-3">
          {ordenes.map((ord) => {
            const abierta = abiertas.has(ord.id);
            return (
              <article key={ord.id} className="border rounded-1 p-3 p-md-4 bg-white shadow-sm" data-testid="orden-historial">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <InsigniaEstadoOrden estado={ord.estado} />
                    <strong className="text-dark">Orden {ord.codigo}</strong>
                    <span className="badge bg-secondary-subtle text-secondary font-monospace">Boleta: {ord.boleta}</span>
                  </div>
                  <div className="text-muted small">
                    <i className="bi bi-calendar3 me-1"></i> {formatearFechaOrden(ord.createdAt)}
                  </div>
                </div>

                <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-dark btn-sm rounded-1"
                    onClick={() => alternar(ord.id)}
                    aria-expanded={abierta}
                  >
                    {abierta ? 'Ocultar detalle' : 'Ver detalle'}
                  </button>
                  <div className="text-end">
                    <span className="text-muted small d-block">Total pagado:</span>
                    <strong className="text-success fs-5 font-monospace">{formatearCLP(ord.total)}</strong>
                  </div>
                </div>

                {abierta && (
                  <div className="mt-3">
                    <div className="table-responsive mb-3">
                      <table className="table table-sm align-middle mb-0">
                        <thead className="table-light small">
                          <tr>
                            <th>Producto</th>
                            <th className="text-center">Cant.</th>
                            <th className="text-end">P. Unitario</th>
                            <th className="text-end">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ord.items.map((item) => (
                            <tr key={`${item.sku}-${item.productoId ?? 'x'}`} className="small">
                              <td className="fw-semibold text-dark">{item.nombre}</td>
                              <td className="text-center">{item.cantidad}</td>
                              <td className="text-end font-monospace">{formatearCLP(item.precioUnitario)}</td>
                              <td className="text-end font-monospace">{formatearCLP(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="small text-muted bg-light p-2 rounded-1">
                      <div><strong>Subtotal:</strong> {formatearCLP(ord.subtotal)}</div>
                      <div><strong>Envío:</strong> {ord.costoEnvio === 0 ? 'Gratis' : formatearCLP(ord.costoEnvio)}</div>
                      <div><strong>Medio de Pago:</strong> {etiquetaMetodoPago(ord.metodoPago)}</div>
                      <div>
                        <strong>Dirección de Entrega:</strong> {ord.envio.direccion}, {ord.envio.comuna}, {ord.envio.region}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
