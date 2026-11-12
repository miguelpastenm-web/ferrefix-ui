// Productos del backend (GET públicos, sin Authorization). El backend NO pagina: devuelve la lista completa.
//   GET /api/v1/productos?q=&categoria=&marca=&sort=campo[,asc|desc]   -> ProductoResponseDto[]
//   GET /api/v1/productos/{id}                                         -> ProductoResponseDto  (404 si no existe)
import { api } from './client';
import { urlMedia } from './media';

const RUTA = '/api/v1/productos';

/** Opción "Todas" de la interfaz: NO es una categoría del backend (enviarla da 400), así que nunca se manda. */
export const CATEGORIA_TODAS = 'Todas';

/**
 * ProductoResponseDto -> forma que usan las pantallas.
 * Se conservan `precioVenta` (precio final con IVA) e `imagen`; `id` es el identificador numérico del backend
 * (el que usan las rutas y las órdenes) y `sku` el código comercial.
 */
export function adaptarProducto(dto) {
  return {
    id: dto.id,
    sku: dto.sku,
    nombre: dto.nombre,
    marca: dto.marca,
    categoria: dto.categoria,
    precioVenta: dto.precioVenta,
    stock: dto.stock,
    estado: dto.estado,
    imagen: urlMedia(dto.imagenUrl),
    imagenOferta: dto.imagenOfertaUrl ? urlMedia(dto.imagenOfertaUrl) : null,
    descripcion: dto.descripcion ?? '',
    especificaciones: dto.especificaciones ?? {},
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt
  };
}

const textoUtil = (valor) => (typeof valor === 'string' ? valor.trim() : '');

/** Arma la query omitiendo lo vacío y la categoría "Todas". */
export function armarQuery({ q, categoria, marca, sort } = {}) {
  const params = new URLSearchParams();
  if (textoUtil(q)) params.set('q', textoUtil(q));
  const cat = textoUtil(categoria);
  if (cat && cat.toLowerCase() !== CATEGORIA_TODAS.toLowerCase()) params.set('categoria', cat);
  if (textoUtil(marca)) params.set('marca', textoUtil(marca));
  if (textoUtil(sort)) params.set('sort', textoUtil(sort));
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

export async function listarProductos(filtros = {}) {
  const lista = await api(`${RUTA}${armarQuery(filtros)}`, { auth: false });
  return (Array.isArray(lista) ? lista : []).map(adaptarProducto);
}

export async function obtenerProducto(id) {
  return adaptarProducto(await api(`${RUTA}/${encodeURIComponent(id)}`, { auth: false }));
}
