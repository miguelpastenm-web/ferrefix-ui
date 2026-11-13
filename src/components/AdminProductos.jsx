import { useMemo, useState } from 'react';
import { CATEGORIAS_PRODUCTOS } from '../data/categorias';
import { formatearCLP } from '../utils/formato';
import { UMBRAL_STOCK_CRITICO, esAgotado, requiereReposicion } from '../utils/metricasAdmin';

/** Inventario de productos: búsqueda y filtros en el cliente, y acciones por fila. */
export default function AdminProductos({ productos, soloCriticos, onAlternarCriticos, onCrear, onEditar, onEditarStock, onEliminar }) {
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todas'); // opción de la interfaz: nunca se envía al servidor

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      const coincideTexto =
        !texto || p.nombre.toLowerCase().includes(texto) || p.marca.toLowerCase().includes(texto) || String(p.sku).toLowerCase().includes(texto);
      const coincideCategoria = categoria === 'Todas' || p.categoria.toLowerCase() === categoria.toLowerCase();
      return coincideTexto && coincideCategoria && (!soloCriticos || requiereReposicion(p));
    });
  }, [productos, busqueda, categoria, soloCriticos]);

  return (
    <div className="admin-box p-3">
      <div className="row g-2 align-items-center mb-3 pb-3 border-bottom">
        <div className="col-12 col-md-4">
          <input
            type="text"
            className="form-control form-control-sm rounded-1"
            placeholder="Buscar por nombre, marca o SKU..."
            aria-label="Buscar productos"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="col-6 col-md-3">
          <select className="form-select form-select-sm rounded-1" aria-label="Filtrar por categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS_PRODUCTOS.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="col-6 col-md-3">
          <button type="button" className={`btn btn-sm w-100 rounded-1 ${soloCriticos ? 'btn-dark' : 'btn-outline-dark'}`} onClick={onAlternarCriticos} aria-pressed={soloCriticos}>
            {soloCriticos ? `Mostrando críticos y agotados (≤ ${UMBRAL_STOCK_CRITICO})` : 'Filtrar stock crítico'}
          </button>
        </div>

        <div className="col-12 col-md-2 admin-ta-md-end">
          <button type="button" className="btn btn-ambar admin-btn-strong btn-sm w-100 rounded-1" onClick={onCrear}>
            + Agregar Producto
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table admin-table align-middle mb-0">
          <thead>
            <tr>
              <th className="admin-th-thumb"></th>
              <th>SKU</th>
              <th>Nombre</th>
              <th>Marca</th>
              <th>Categoría</th>
              <th className="admin-ta-end">Precio (CLP)</th>
              <th className="admin-ta-center">Stock</th>
              <th className="admin-th-actions admin-ta-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan="8" className="admin-ta-center admin-muted py-4">
                  No se encontraron productos registrados con los filtros aplicados.
                </td>
              </tr>
            ) : (
              filtrados.map((prod) => {
                const agotado = esAgotado(prod);
                const bajo = !agotado && requiereReposicion(prod);
                return (
                  <tr key={prod.id} data-testid="fila-producto">
                    <td>
                      <img
                        src={prod.imagen}
                        alt={prod.nombre}
                        className="admin-prod-thumb border rounded-1 bg-white object-fit-contain"
                        onError={(e) => { e.target.src = '/banner-web.webp'; }}
                      />
                    </td>
                    <td className="admin-cell-code">#{prod.sku}</td>
                    <td><div className="admin-cell-strong">{prod.nombre}</div></td>
                    <td className="admin-muted">{prod.marca}</td>
                    <td><span className="admin-badge-soft">{prod.categoria}</span></td>
                    <td className="admin-ta-end admin-cell-price">{formatearCLP(prod.precioVenta)}</td>
                    <td className="admin-ta-center">
                      <span className={agotado || bajo ? 'admin-badge-warn' : 'admin-badge-soft'}>
                        {agotado ? 'Agotado' : `${prod.stock} unids${bajo ? ' (Bajo)' : ''}`}
                      </span>
                    </td>
                    <td className="admin-ta-end">
                      <div className="btn-group btn-group-sm">
                        <button type="button" className="btn btn-outline-dark rounded-1 px-2 py-0 me-1" onClick={() => onEditar(prod)} aria-label={`Editar ${prod.nombre}`}>
                          Editar
                        </button>
                        <button type="button" className="btn btn-outline-dark rounded-1 px-2 py-0 me-1" onClick={() => onEditarStock(prod)} aria-label={`Editar stock de ${prod.nombre}`}>
                          Stock
                        </button>
                        <button type="button" className="btn btn-outline-danger rounded-1 px-2 py-0" onClick={() => onEliminar(prod)} aria-label={`Eliminar ${prod.nombre}`}>
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

      <div className="admin-muted d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
        <span>Mostrando {filtrados.length} de {productos.length} productos en total</span>
        <span>Categoría: {categoria}</span>
      </div>
    </div>
  );
}
