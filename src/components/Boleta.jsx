import { Link } from 'react-router-dom';
import InsigniaEstadoOrden from './InsigniaEstadoOrden';
import { formatearCLP } from '../utils/formato';
import { etiquetaMetodoPago, formatearFechaOrden } from '../utils/estadosOrden';

/**
 * Boleta de una compra. Muestra EXACTAMENTE lo que devolvió el servidor (precios, subtotal, envío y total); no
 * recalcula nada. El cliente (nombre, RUT, correo) sale de la sesión: el backend no lo incluye en la respuesta del cliente.
 */
export default function Boleta({ orden, cliente }) {
  return (
    <div className="bg-white border rounded-1 shadow-sm p-4 p-md-5" data-testid="boleta">
      <div className="marca-centro pb-4 border-bottom mb-4">
        <div className="d-inline-flex p-3 bg-success-subtle marca-exito rounded-circle mb-3">
          <i className="bi bi-check-lg carrito-check-icon" aria-hidden="true"></i>
        </div>
        <h1 className="marca-titulo marca-tam-4 mb-1">¡Se ha realizado la compra con éxito!</h1>
        <div className="d-flex flex-wrap justify-content-center gap-2 mt-2">
          <span className="marca-chip marca-chip--oscuro marca-mono px-3 py-2">Orden: {orden.codigo}</span>
          <span className="marca-chip marca-chip--gris marca-mono px-3 py-2">N° Boleta: {orden.boleta}</span>
        </div>
        <div className="mt-2">
          <InsigniaEstadoOrden estado={orden.estado} />
        </div>
      </div>

      <div className="mb-4 marca-fino">
        <div className="row g-2">
          {cliente && (
            <>
              <div className="col-sm-6">
                <strong className="d-block marca-muted">Cliente:</strong>
                <span className="marca-strong">{cliente.nombre}</span>
              </div>
              <div className="col-sm-6">
                <strong className="d-block marca-muted">RUT:</strong>
                <span className="marca-oscuro">{cliente.rut}</span>
              </div>
              <div className="col-sm-6 mt-2">
                <strong className="d-block marca-muted">Correo:</strong>
                <span className="marca-oscuro">{cliente.email}</span>
              </div>
            </>
          )}
          <div className="col-sm-6 mt-2">
            <strong className="d-block marca-muted">Teléfono:</strong>
            <span className="marca-oscuro">{orden.envio.telefono}</span>
          </div>
          <div className="col-12 mt-2">
            <strong className="d-block marca-muted">Dirección de Entrega:</strong>
            <span className="marca-oscuro">
              {orden.envio.direccion}, {orden.envio.comuna}, {orden.envio.region}
            </span>
          </div>
          {orden.envio.indicaciones && (
            <div className="col-12 mt-2">
              <strong className="d-block marca-muted">Indicaciones:</strong>
              <span className="marca-oscuro">{orden.envio.indicaciones}</span>
            </div>
          )}
          <div className="col-sm-6 mt-2">
            <strong className="d-block marca-muted">Fecha de Pago:</strong>
            <span className="marca-oscuro">{formatearFechaOrden(orden.createdAt)}</span>
          </div>
          <div className="col-sm-6 mt-2">
            <strong className="d-block marca-muted">Método de Pago:</strong>
            <span className="marca-oscuro">{etiquetaMetodoPago(orden.metodoPago)}</span>
          </div>
        </div>
      </div>

      <div className="table-responsive border rounded-1 mb-4">
        <table className="table table-sm align-middle mb-0 marca-fino">
          <thead className="table-light">
            <tr>
              <th>Producto</th>
              <th className="marca-centro">Cant.</th>
              <th className="marca-derecha">P. Unitario</th>
              <th className="marca-derecha">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {orden.items.map((it) => (
              <tr key={`${it.sku}-${it.productoId ?? 'x'}`}>
                <td>
                  {it.nombre} <small className="text-muted">SKU {it.sku}</small>
                </td>
                <td className="marca-centro">{it.cantidad}</td>
                <td className="marca-derecha marca-mono">{formatearCLP(it.precioUnitario)}</td>
                <td className="marca-derecha marca-mono">{formatearCLP(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-platino border rounded-1 mb-4">
        <div className="d-flex justify-content-between mb-1 marca-fino">
          <span>Subtotal:</span>
          <span className="marca-mono">{formatearCLP(orden.subtotal)}</span>
        </div>
        <div className="d-flex justify-content-between mb-2 marca-fino">
          <span>Costo de envío:</span>
          <span className="marca-mono">{orden.costoEnvio === 0 ? 'Gratis' : formatearCLP(orden.costoEnvio)}</span>
        </div>
        <div className="d-flex justify-content-between align-items-center pt-2 border-top">
          <span className="marca-bold marca-tam-5">Total Pagado:</span>
          <span className="marca-total marca-exito">{formatearCLP(orden.total)}</span>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 justify-content-center">
        <Link to="/cuenta?tab=compras" className="btn btn-outline-dark btn-sm rounded-1 px-4">
          Ver Mis compras
        </Link>
        <Link to="/catalogo" className="btn btn-ambar btn-sm marca-strong rounded-1 px-4">
          Volver al Catálogo
        </Link>
      </div>
    </div>
  );
}
