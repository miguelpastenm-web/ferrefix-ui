// Conciliación del carrito (guardado en el navegador) con el catálogo real. Funciones PURAS: nunca lanzan.

export const PROBLEMA = { NO_EXISTE: 'no-existe', AGOTADO: 'agotado', EXCEDE: 'excede' };

const estaAgotado = (p) => p.estado === 'AGOTADO' || !(Number(p.stock) > 0);

/**
 * Actualiza cada línea con los datos vigentes del producto (precio, stock, nombre, imagen). NO toca las cantidades.
 * Un cambio de precio no bloquea: se aplica y se informa en `cambiosPrecio`.
 * @returns {{items:object[], cambiosPrecio:{productoId:number, nombre:string, anterior:number, nuevo:number}[], huboCambios:boolean}}
 */
export function sincronizarCarrito(items, productos) {
  const porId = new Map((productos ?? []).map((p) => [Number(p.id), p]));
  const cambiosPrecio = [];
  let huboCambios = false;
  const nuevos = (items ?? []).map((item) => {
    const p = porId.get(Number(item.productoId));
    if (!p) return item;
    if (Number(p.precioVenta) !== Number(item.precioVenta)) {
      cambiosPrecio.push({ productoId: item.productoId, nombre: p.nombre, anterior: Number(item.precioVenta), nuevo: Number(p.precioVenta) });
    }
    const actualizado = { ...item, sku: p.sku, nombre: p.nombre, marca: p.marca, imagen: p.imagen, precioVenta: p.precioVenta, stock: p.stock };
    if (JSON.stringify(actualizado) !== JSON.stringify(item)) huboCambios = true;
    return actualizado;
  });
  return { items: nuevos, cambiosPrecio, huboCambios };
}

/**
 * Problemas que impiden comprar: { [productoId]: { tipo, stockDisponible? } }.
 * Con `productos` null/undefined (todavía no se pudo consultar el catálogo) no se afirma nada.
 */
export function detectarProblemas(items, productos) {
  if (!Array.isArray(productos)) return {};
  const porId = new Map(productos.map((p) => [Number(p.id), p]));
  const problemas = {};
  (items ?? []).forEach((item) => {
    const p = porId.get(Number(item.productoId));
    if (!p) problemas[item.productoId] = { tipo: PROBLEMA.NO_EXISTE };
    else if (estaAgotado(p)) problemas[item.productoId] = { tipo: PROBLEMA.AGOTADO };
    else if (Number(item.cantidad) > Number(p.stock)) problemas[item.productoId] = { tipo: PROBLEMA.EXCEDE, stockDisponible: Number(p.stock) };
  });
  return problemas;
}
