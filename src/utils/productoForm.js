// Formulario de producto del panel de administración: valida con LAS MISMAS reglas que el backend
// (ProductoRequestDto) y arma el cuerpo que espera la API.
import { CATEGORIAS_PRODUCTOS } from '../data/categorias';

export const CATEGORIAS_FORMULARIO = CATEGORIAS_PRODUCTOS.filter((c) => c !== 'Todas');

export const LIMITES_PRODUCTO = {
  sku: 30, nombre: 150, marca: 60, descripcion: 2000, url: 300, precioMax: 999_999_999, stockMax: 1_000_000
};

// Categoría preseleccionada en el alta (la misma que tenía el formulario original)
export const CATEGORIA_POR_DEFECTO = 'Herramientas';

export const formularioVacio = () => ({
  sku: '', nombre: '', marca: '', categoria: CATEGORIA_POR_DEFECTO,
  precioVenta: '', stock: '', descripcion: '', imagenUrl: '', imagenOfertaUrl: '', especificaciones: {}
});

/** Carga el formulario con un producto (forma de api/productos). Las rutas de imagen son las RELATIVAS del backend. */
export const formularioDesdeProducto = (p) => ({
  sku: p.sku ?? '',
  nombre: p.nombre ?? '',
  marca: p.marca ?? '',
  categoria: p.categoria ?? CATEGORIAS_FORMULARIO[0],
  precioVenta: String(p.precioVenta ?? ''),
  stock: String(p.stock ?? ''),
  descripcion: p.descripcion ?? '',
  imagenUrl: p.imagenUrl ?? '',
  imagenOfertaUrl: p.imagenOfertaUrl ?? '',
  especificaciones: { ...(p.especificaciones ?? {}) }
});

const t = (v) => String(v ?? '').trim();
const ENTERO = /^-?\d+$/;
const URL_VALIDA = /^(\/|https?:\/\/).*$|^$/;

export function validarStock(valor) {
  const v = t(valor);
  if (!v) return 'El stock es obligatorio';
  if (!ENTERO.test(v)) return 'El stock debe ser un número entero';
  const n = Number(v);
  if (n < 0) return 'El stock no puede ser negativo';
  if (n > LIMITES_PRODUCTO.stockMax) return 'El stock supera el máximo permitido';
  return '';
}

/** @returns {Record<string,string>} errores por campo (vacío si todo está bien). Mensajes iguales a los del backend. */
export function validarProducto(form) {
  const e = {};
  const sku = t(form.sku);
  if (!sku) e.sku = 'El SKU es obligatorio';
  else if (sku.length > LIMITES_PRODUCTO.sku) e.sku = 'El SKU no puede superar 30 caracteres';
  else if (!/^[A-Za-z0-9._-]+$/.test(sku)) e.sku = 'El SKU solo admite letras, números, punto, guion y guion bajo';

  const nombre = t(form.nombre);
  if (!nombre) e.nombre = 'El nombre es obligatorio';
  else if (nombre.length > LIMITES_PRODUCTO.nombre) e.nombre = 'El nombre no puede superar 150 caracteres';

  const marca = t(form.marca);
  if (!marca) e.marca = 'La marca es obligatoria';
  else if (marca.length > LIMITES_PRODUCTO.marca) e.marca = 'La marca no puede superar 60 caracteres';

  const categoria = t(form.categoria);
  if (!categoria) e.categoria = 'La categoría es obligatoria';
  else if (!CATEGORIAS_FORMULARIO.some((c) => c.toLowerCase() === categoria.toLowerCase())) {
    e.categoria = `Categoría inválida. Valores permitidos: ${CATEGORIAS_FORMULARIO.join(', ')}`;
  }

  const precio = t(form.precioVenta);
  if (!precio) e.precioVenta = 'El precio es obligatorio';
  else if (!ENTERO.test(precio)) e.precioVenta = 'El precio debe ser un número entero';
  else if (Number(precio) < 1) e.precioVenta = 'El precio debe ser mayor a 0';
  else if (Number(precio) > LIMITES_PRODUCTO.precioMax) e.precioVenta = 'El precio supera el máximo permitido';

  const errorStock = validarStock(form.stock);
  if (errorStock) e.stock = errorStock;

  if (t(form.descripcion).length > LIMITES_PRODUCTO.descripcion) e.descripcion = 'La descripción no puede superar 2000 caracteres';

  [['imagenUrl', 'la imagen'], ['imagenOfertaUrl', 'la imagen de oferta']].forEach(([campo, nombreCampo]) => {
    const url = t(form[campo]);
    if (url.length > LIMITES_PRODUCTO.url) e[campo] = `La URL de ${nombreCampo} no puede superar 300 caracteres`;
    else if (!URL_VALIDA.test(url)) e[campo] = `La URL de ${nombreCampo} debe ser relativa (/media/...) o http(s)`;
  });
  return e;
}

/** Cuerpo de POST/PUT. Textos recortados, números reales, vacíos como null. Las especificaciones viajan completas. */
export function aRequestDto(form) {
  return {
    sku: t(form.sku),
    nombre: t(form.nombre),
    marca: t(form.marca),
    categoria: t(form.categoria),
    precioVenta: Number(t(form.precioVenta)),
    stock: Number(t(form.stock)),
    descripcion: t(form.descripcion) || null,
    imagenUrl: t(form.imagenUrl) || null,
    imagenOfertaUrl: t(form.imagenOfertaUrl) || null,
    especificaciones: { ...(form.especificaciones ?? {}) }
  };
}
