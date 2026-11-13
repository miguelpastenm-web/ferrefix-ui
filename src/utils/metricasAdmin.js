// Métricas del panel de administración, calculadas desde los productos que entrega la API.

/**
 * Umbral de "stock crítico". Es una constante del front por ahora.
 * PENDIENTE (a decidir): el Anexo 1 del examen pide un stock crítico POR PRODUCTO (campo opcional) y el backend
 * no tiene ese campo.
 */
export const UMBRAL_STOCK_CRITICO = 5;

export const esAgotado = (p) => p.estado === 'AGOTADO' || !(Number(p.stock) > 0);

/** Crítico = quedan entre 1 y el umbral. Los agotados (0) se cuentan aparte. */
export const esStockCritico = (p) => !esAgotado(p) && Number(p.stock) <= UMBRAL_STOCK_CRITICO;

/** Productos que piden reposición: críticos y agotados. */
export const requiereReposicion = (p) => esAgotado(p) || esStockCritico(p);

export function calcularMetricasProductos(productos) {
  const lista = Array.isArray(productos) ? productos : [];
  return {
    totalProductos: lista.length,
    stockCritico: lista.filter(esStockCritico).length,
    agotados: lista.filter(esAgotado).length,
    valorInventario: lista.reduce((acc, p) => acc + (Number(p.precioVenta) || 0) * Math.max(0, Number(p.stock) || 0), 0)
  };
}
