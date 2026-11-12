// CARRITO DE COMPRAS (en el navegador, clave ferrefix_carrito_v2)
//
// Cada línea guarda lo mínimo para mostrar el carrito sin red:
//   { productoId (id numérico del backend), sku, nombre, marca, imagen, precioVenta, stock, cantidad }
// `precioVenta` y `stock` son lo ÚLTIMO que se vio del catálogo (informativo): al abrir el carrito se vuelven a
// consultar (utils/carritoSync) y al comprar el servidor usa SIEMPRE los precios reales. Al backend solo viajan
// productoId y cantidad.
//
// La v1 (ids = SKU, precios locales) no se puede migrar: se descarta y se borra.
import { estimarEnvio } from '../utils/envio';

const STORAGE_KEY_CARRITO = 'ferrefix_carrito_v2';
const STORAGE_KEY_CARRITO_ANTIGUO = 'ferrefix_carrito_v1';
export const EVENTO_CARRITO_ACTUALIZADO = 'ferrefix:carrito_actualizado';
const CANTIDAD_MAXIMA_POR_PRODUCTO = 1000; // límite del backend por línea

const hayAlmacenamiento = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const notificarCarrito = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_CARRITO_ACTUALIZADO));
  }
};

const lineaValida = (l) =>
  l && Number.isInteger(Number(l.productoId)) && Number(l.productoId) > 0 && Number.isInteger(Number(l.cantidad)) && Number(l.cantidad) >= 1;

/** Obtiene las líneas del carrito (ignora las dañadas; nunca lanza). */
export const obtenerCarrito = () => {
  if (!hayAlmacenamiento()) return [];
  let lineas = [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_CARRITO);
    const lista = data ? JSON.parse(data) : [];
    lineas = Array.isArray(lista) ? lista.filter(lineaValida) : [];
  } catch (error) {
    console.error('Error al leer el carrito de localStorage:', error);
  }
  try {
    if (localStorage.getItem(STORAGE_KEY_CARRITO_ANTIGUO) !== null) localStorage.removeItem(STORAGE_KEY_CARRITO_ANTIGUO);
  } catch {
    // sin acceso al almacenamiento: no hay nada que limpiar
  }
  return lineas;
};

export const guardarCarrito = (items) => {
  if (!hayAlmacenamiento()) return;
  try {
    localStorage.setItem(STORAGE_KEY_CARRITO, JSON.stringify(items));
  } catch (error) {
    console.error('No se pudo guardar el carrito:', error);
  }
  notificarCarrito();
};

const mismoProducto = (item, productoId) => Number(item.productoId) === Number(productoId);

/**
 * Agrega un producto (con la forma de api/productos) validando estado y stock.
 * Un producto AGOTADO (o sin stock) NO se puede agregar.
 */
export const agregarAlCarrito = (producto, cantidadDeseada = 1) => {
  if (!producto || !Number.isInteger(Number(producto.id)) || Number(producto.id) <= 0) {
    return { ok: false, error: 'Producto no válido' };
  }
  const cantidad = Number(cantidadDeseada);
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return { ok: false, error: 'La cantidad debe ser al menos 1.' };
  }

  const stockMaximo = Math.min(Number(producto.stock) || 0, CANTIDAD_MAXIMA_POR_PRODUCTO);
  if (producto.estado === 'AGOTADO' || stockMaximo <= 0) {
    return { ok: false, error: 'El producto no cuenta con stock disponible actualmente.' };
  }

  const carrito = obtenerCarrito();
  const indice = carrito.findIndex((item) => mismoProducto(item, producto.id));
  const nuevaCantidad = (indice !== -1 ? carrito[indice].cantidad : 0) + cantidad;

  if (nuevaCantidad > stockMaximo) {
    return {
      ok: false,
      error:
        indice !== -1
          ? `No puedes agregar más unidades. El stock máximo disponible es de ${stockMaximo} unidades.`
          : `No puedes agregar ${nuevaCantidad} unidades. Solo hay ${stockMaximo} disponibles en stock.`
    };
  }

  const linea = {
    productoId: Number(producto.id),
    sku: producto.sku,
    nombre: producto.nombre,
    marca: producto.marca,
    imagen: producto.imagen || '/banner-web.webp',
    precioVenta: Number(producto.precioVenta) || 0,
    stock: Number(producto.stock) || 0,
    cantidad: nuevaCantidad
  };
  if (indice !== -1) carrito[indice] = linea;
  else carrito.push(linea);

  guardarCarrito(carrito);
  return {
    ok: true,
    mensaje: `Se agregaron ${cantidad} unid(s) de "${producto.nombre}" al carrito.`,
    cantidadTotal: nuevaCantidad
  };
};

/** Cambia la cantidad de una línea (0 o menos la elimina; no puede superar el último stock conocido). */
export const actualizarCantidad = (productoId, nuevaCantidad) => {
  const carrito = obtenerCarrito();
  const indice = carrito.findIndex((item) => mismoProducto(item, productoId));
  if (indice === -1) return { ok: false, error: 'El producto no está en el carrito.' };

  const cantidadNum = Number(nuevaCantidad);
  if (!Number.isFinite(cantidadNum)) return { ok: false, error: 'Cantidad no válida.' };
  if (cantidadNum <= 0) return eliminarDelCarrito(productoId);

  const stockMaximo = Math.min(Number(carrito[indice].stock) || 0, CANTIDAD_MAXIMA_POR_PRODUCTO);
  if (cantidadNum > stockMaximo) {
    return { ok: false, error: `La cantidad solicitada supera el stock disponible (${stockMaximo} unids).` };
  }

  carrito[indice] = { ...carrito[indice], cantidad: Math.floor(cantidadNum) };
  guardarCarrito(carrito);
  return { ok: true };
};

export const eliminarDelCarrito = (productoId) => {
  guardarCarrito(obtenerCarrito().filter((item) => !mismoProducto(item, productoId)));
  return { ok: true };
};

export const vaciarCarrito = () => {
  guardarCarrito([]);
};

/**
 * Totales ESTIMADOS de unas líneas. El envío es una estimación (utils/envio): el costo real y el total definitivo
 * los calcula el servidor al crear la orden.
 */
export const calcularTotales = (items) => {
  const totalArticulos = items.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0);
  const subtotal = items.reduce((acc, item) => acc + (Number(item.precioVenta) || 0) * (Number(item.cantidad) || 0), 0);
  const despachoEstimado = estimarEnvio(subtotal);
  return { totalArticulos, subtotal, despachoEstimado, totalEstimado: subtotal + despachoEstimado };
};

export const obtenerTotalesCarrito = () => calcularTotales(obtenerCarrito());
