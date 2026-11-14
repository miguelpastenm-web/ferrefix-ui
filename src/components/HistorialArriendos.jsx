import { Link } from 'react-router-dom';
import { misArriendos } from '../api/arriendos';
import { useCarga } from '../hooks/useCarga';
import { IndicadorCarga } from './EsperarSesion';
import ErrorCarga from './ErrorCarga';
import { formatearCLP } from '../utils/formato';
import { formatearFechaOrden } from '../utils/estadosOrden';

const INFO_ESTADO_ARRIENDO = {
  VIGENTE: { etiqueta: 'Vigente', clase: 'bg-success' },
  FINALIZADO: { etiqueta: 'Finalizado', clase: 'bg-secondary' }
};

/** Historial de arriendos del cliente, desde GET /arriendos/mis-arriendos. */
export default function HistorialArriendos() {
  const { datos: arriendos, cargando, error, recargar } = useCarga(misArriendos, 'mis-arriendos');

  return (
    <div className="info-card shadow-sm p-4 p-md-5">
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom flex-wrap gap-2">
        <div>
          <h2 className="info-section-title mb-1">Mis Contratos de Arriendo de Maquinaria</h2>
          <span className="text-muted small">Control de equipos en obra, vigencia de contratos y tarifas diarias</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          {arriendos && <span className="badge bg-dark px-3 py-2 font-monospace">Total Arriendos: {arriendos.length}</span>}
          <Link to="/arriendos" className="btn btn-ambar btn-sm rounded-1 px-3 fw-bold">
            <i className="bi bi-plus-circle me-1"></i> Arrendar Nuevo Equipo
          </Link>
        </div>
      </div>

      {cargando && <IndicadorCarga etiqueta="Cargando tus arriendos…" />}
      {error && <ErrorCarga error={error} onReintentar={recargar} titulo="No pudimos cargar tus arriendos" />}

      {arriendos && arriendos.length === 0 && (
        <div className="text-center py-5">
          <i className="bi bi-truck text-muted display-4 mb-3 d-block"></i>
          <h3 className="h5 text-dark mb-2">No tienes maquinarias arrendadas actualmente</h3>
          <p className="text-secondary small mb-4">
            Explora nuestro catálogo de maquinaria en arriendo para tu faena.
          </p>
          <Link to="/arriendos" className="btn btn-ambar px-4 py-2 rounded-1 fw-bold">
            Ver Equipos Disponibles
          </Link>
        </div>
      )}

      {arriendos && arriendos.length > 0 && (
        <div className="row g-3">
          {arriendos.map((contrato) => {
            const info = INFO_ESTADO_ARRIENDO[contrato.estado] ?? {
              etiqueta: contrato.estado || 'Sin estado',
              clase: 'bg-secondary'
            };
            return (
              <div key={contrato.id} className="col-12 col-md-6" data-testid="tarjeta-arriendo">
                <div className="border rounded-1 p-4 bg-white shadow-sm h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className={`badge ${info.clase}`}>
                        ● {info.etiqueta}
                      </span>
                      <span className="badge bg-light text-dark border font-monospace">
                        {contrato.codigo}
                      </span>
                    </div>

                    <h3 className="h5 fw-bold text-dark mb-1">{contrato.maquina?.nombre ?? 'Maquinaria'}</h3>
                    <div className="text-muted small mb-3">
                      {contrato.maquina?.marca ?? 'Industrial'} · Unidad: <span className="font-monospace">{contrato.unidadCodigo}</span>
                    </div>

                    <div className="p-3 bg-light rounded-1 border mb-3 small">
                      <div><strong>Tarifa diaria:</strong> {formatearCLP(contrato.tarifaDia)} / día</div>
                      <div><strong>Período:</strong> {contrato.dias} días ({contrato.fechaInicio} al {contrato.fechaFin})</div>
                      <div><strong>Lugar de Faena:</strong> {contrato.direccionFaena}, {contrato.comunaFaena}, {contrato.regionFaena}</div>
                      <div><strong>Contacto:</strong> {contrato.telefonoContacto}</div>
                      <div><strong>Fecha de Solicitud:</strong> {formatearFechaOrden(contrato.createdAt)}</div>
                      {contrato.fechaDevolucion && (
                        <div><strong>Devolución:</strong> {formatearFechaOrden(contrato.fechaDevolucion)}</div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                    <span className="text-muted small">Costo Total Arriendo:</span>
                    <strong className="text-dark fs-5 font-monospace">{formatearCLP(contrato.total)}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

