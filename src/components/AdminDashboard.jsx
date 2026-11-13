import { formatearCLP } from '../utils/formato';
import { UMBRAL_STOCK_CRITICO, esAgotado } from '../utils/metricasAdmin';

/** Resumen del panel. `ventas` = {titulo, valor, subtitulo} (lo arma quien conoce las órdenes). */
export default function AdminDashboard({ metricas, ventas, productosReposicion, onIrAInventario, onEditarStock }) {
  return (
    <div>
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="admin-kpi-box">
            <div className="admin-kpi-title">Productos en Catálogo</div>
            <div className="admin-kpi-value mt-1" data-testid="kpi-productos">{metricas.totalProductos}</div>
            <div className="admin-kpi-subtitle mt-1">Artículos registrados</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="admin-kpi-box">
            <div className="admin-kpi-title">Stock Crítico (1 a {UMBRAL_STOCK_CRITICO} unids)</div>
            <div className="admin-kpi-value mt-1" data-testid="kpi-critico">{metricas.stockCritico}</div>
            <div className="admin-kpi-subtitle mt-1" data-testid="kpi-agotados">
              {metricas.agotados} {metricas.agotados === 1 ? 'agotado' : 'agotados'}
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="admin-kpi-box">
            <div className="admin-kpi-title">Valor Total Inventario</div>
            <div className="admin-kpi-value admin-kpi-value-mono mt-1" data-testid="kpi-inventario">{formatearCLP(metricas.valorInventario)}</div>
            <div className="admin-kpi-subtitle mt-1">Precio venta × stock</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="admin-kpi-box">
            <div className="admin-kpi-title">{ventas.titulo}</div>
            <div className="admin-kpi-value admin-kpi-value-mono mt-1" data-testid="kpi-ventas">{ventas.valor}</div>
            <div className="admin-kpi-subtitle mt-1">{ventas.subtitulo}</div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12">
          <div className="admin-box p-3">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <h2 className="admin-section-title mb-0">Inventario con Stock Crítico (≤ {UMBRAL_STOCK_CRITICO}) y Agotados</h2>
                <span className="admin-muted">Productos que requieren reposición prioritaria de inventario</span>
              </div>
              <button type="button" className="btn btn-outline-dark btn-sm rounded-1" onClick={onIrAInventario}>
                Ir a Inventario Completo →
              </button>
            </div>

            {productosReposicion.length === 0 ? (
              <div className="admin-empty admin-ta-center p-3">
                Todos los productos cuentan con stock superior a {UMBRAL_STOCK_CRITICO} unidades.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table admin-table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th className="admin-ta-center">Stock Disponible</th>
                      <th className="admin-ta-end">Precio (CLP)</th>
                      <th className="admin-ta-end">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosReposicion.map((p) => (
                      <tr key={p.id} data-testid="fila-reposicion">
                        <td className="admin-cell-code">#{p.sku}</td>
                        <td>
                          <div className="admin-cell-strong">{p.nombre}</div>
                          <div className="admin-item-brand">{p.marca}</div>
                        </td>
                        <td><span className="admin-badge-soft">{p.categoria}</span></td>
                        <td className="admin-ta-center">
                          <span className="admin-badge-dark">
                            {esAgotado(p) ? 'Agotado' : `${p.stock} unids (Bajo)`}
                          </span>
                        </td>
                        <td className="admin-ta-end admin-cell-price">{formatearCLP(p.precioVenta)}</td>
                        <td className="admin-ta-end">
                          <button type="button" className="btn btn-sm btn-outline-dark rounded-1 py-0 px-2" onClick={() => onEditarStock(p)}>
                            Editar Stock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
