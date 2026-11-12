// Interpreta los rechazos de POST /api/v1/ordenes para marcar qué líneas del carrito los causaron.
//
// Formatos REALES del backend (OrdenServiceImpl):
//  409 stock:   message "No hay stock suficiente para completar la compra. No se descontó nada"
//               details  ["Esmeril Angular 4-1/2\" 850W (SKU 5422223216): agotado",
//                         "Sierra (SKU 5422223215): disponibles 3, solicitaste 5",
//                         "Producto 7: ya no existe"]
//  409 bloqueo: message "El recurso está siendo modificado por otra operación. Intente nuevamente"
//  404:         message "Producto no encontrado: [3, 9]"

/** Texto exacto pedido para cuando no se pudo confirmar si la compra se hizo (sin respuesta del servidor). */
export const MENSAJE_COMPRA_SIN_CONFIRMAR = 'No pudimos confirmar tu compra; revisa Mis compras antes de volver a intentar';

/** Texto para un 401 al confirmar: la sesión ya no es válida y la orden no se creó. */
export const MENSAJE_SESION_EXPIRADA = 'Tu sesión expiró; inicia sesión para terminar tu compra';

export const esConflictoDeBloqueo = (error) => error?.status === 409 && /modificado por otra operaci/i.test(error.mensaje ?? '');
export const esConflictoDeStock = (error) => error?.status === 409 && !esConflictoDeBloqueo(error);

/** "…(SKU 5422223216): agotado" -> "5422223216" (null si el detalle no trae SKU). */
export const skuDeDetalle = (detalle) => /\(SKU ([^)]+)\)/.exec(String(detalle ?? ''))?.[1]?.trim() ?? null;

/** "Producto 7: ya no existe" -> 7 (null si no calza). */
export const idDeProductoInexistente = (detalle) => {
  const m = /^Producto (\d+): ya no existe/i.exec(String(detalle ?? '').trim());
  return m ? Number(m[1]) : null;
};

/** "Producto no encontrado: [3, 9]" o "Producto no encontrado: 9" -> [3, 9] */
export const idsNoEncontrados = (mensaje) => {
  const m = /no encontrado:\s*(.+)$/i.exec(String(mensaje ?? ''));
  return m ? (m[1].match(/\d+/g) ?? []).map(Number) : [];
};

/**
 * Líneas del carrito afectadas por el rechazo: { [productoId]: texto a mostrar }.
 * Los detalles que no se pueden asociar a una línea quedan solo en el mensaje general.
 */
export function marcasDeError(error, items) {
  const marcas = {};
  const porSku = new Map(items.map((i) => [String(i.sku), i]));
  const porId = new Map(items.map((i) => [Number(i.productoId), i]));
  if (error?.status === 409) {
    (error.detalles ?? []).forEach((detalle) => {
      const sku = skuDeDetalle(detalle);
      const idInexistente = idDeProductoInexistente(detalle);
      const linea = sku ? porSku.get(sku) : idInexistente != null ? porId.get(idInexistente) : null;
      if (linea) marcas[linea.productoId] = detalle;
    });
  } else if (error?.status === 404) {
    idsNoEncontrados(error.mensaje).forEach((id) => {
      const linea = porId.get(id);
      if (linea) marcas[linea.productoId] = 'Este producto ya no existe en el catálogo.';
    });
  }
  return marcas;
}
