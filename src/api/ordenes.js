// Órdenes de compra del backend.
//   POST /api/v1/ordenes              (CLIENTE)  -> 201 OrdenResponseDto. Precios, subtotal, envío y total los calcula el servidor.
//   GET  /api/v1/ordenes/mis-ordenes  (CLIENTE)  -> OrdenResponseDto[] (la más reciente primero, sin paginación)
//   GET  /api/v1/ordenes/{id}                    -> OrdenResponseDto (una orden ajena responde 404)
//
// OrdenResponseDto: {id, codigo "ORD-000012", boleta "BOL-000012", estado, metodoPago, items[{productoId, sku, nombre,
//   precioUnitario, cantidad, subtotal}], subtotal, costoEnvio, total, envio{telefono, direccion, region, comuna,
//   indicaciones}, createdAt, updatedAt}   (createdAt/updatedAt: texto ISO sin zona, hora de Chile)
import { api } from './client';

const RUTA = '/api/v1/ordenes';

/**
 * @param {{items:{productoId:number, cantidad:number}[], metodoPago:string, telefono:string, direccionEnvio:string,
 *          region:string, comuna:string, indicaciones?:string}} datos
 * Solo viajan producto y cantidad por línea: nunca precios ni totales (el servidor los calcula).
 */
export function crearOrden(datos) {
  const cuerpo = {
    items: datos.items.map((linea) => ({ productoId: linea.productoId, cantidad: linea.cantidad })),
    metodoPago: datos.metodoPago,
    telefono: String(datos.telefono ?? '').trim(),
    direccionEnvio: String(datos.direccionEnvio ?? '').trim(),
    region: String(datos.region ?? '').trim(),
    comuna: String(datos.comuna ?? '').trim()
  };
  const indicaciones = String(datos.indicaciones ?? '').trim();
  if (indicaciones) cuerpo.indicaciones = indicaciones;
  return api(RUTA, { metodo: 'POST', cuerpo });
}

export const misOrdenes = async () => {
  const lista = await api(`${RUTA}/mis-ordenes`);
  return Array.isArray(lista) ? lista : [];
};

export const obtenerOrden = (id) => api(`${RUTA}/${encodeURIComponent(id)}`);

const textoUtil = (valor) => (typeof valor === 'string' ? valor.trim() : '');

/** Arma la query de órdenes omitiendo filtros vacíos. */
export function armarQueryOrdenes({ estado, usuarioId } = {}) {
  const params = new URLSearchParams();
  const est = textoUtil(estado);
  if (est && est.toLowerCase() !== 'todos' && est.toLowerCase() !== 'todas') {
    params.set('estado', est);
  }
  if (usuarioId !== undefined && usuarioId !== null && String(usuarioId).trim() !== '') {
    params.set('usuarioId', String(usuarioId).trim());
  }
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

// ---- ADMIN ------------------------------------------------------------------------------------------------------
//   GET    /api/v1/ordenes?estado=&usuarioId=   -> OrdenResponseDto[]
//   PATCH  /api/v1/ordenes/{id}/estado          -> { estado } -> 200 OrdenResponseDto | 400 | 404 | 409
//   DELETE /api/v1/ordenes/{id}                 -> 204 | 404 | 409

export async function listarOrdenes(filtros = {}) {
  const lista = await api(`${RUTA}${armarQueryOrdenes(filtros)}`);
  return Array.isArray(lista) ? lista : [];
}

export function cambiarEstadoOrden(id, estado) {
  return api(`${RUTA}/${encodeURIComponent(id)}/estado`, {
    metodo: 'PATCH',
    cuerpo: { estado }
  });
}

export async function eliminarOrden(id) {
  await api(`${RUTA}/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
}
