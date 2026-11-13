// Subida de imágenes al backend (solo ADMIN).
//   POST /api/v1/imagenes  (multipart/form-data)  partes: `archivo` (el archivo) y `destino`
//   -> 201 {url: "/media/<destino>/<uuid>.<ext>", destino, tipo, tamano}
// El servidor valida por el CONTENIDO del archivo (JPEG, PNG, WEBP o AVIF), máximo 6 MB, y destinos cerrados.
// Aquí se hacen además prechequeos de tipo y tamaño para avisar antes de gastar la subida.
import { api } from './client';
import { ApiError } from './errores';
import { TIEMPO_MAXIMO_SUBIDA_MS } from './config';

export const TAMANO_MAXIMO_IMAGEN_BYTES = 6 * 1024 * 1024;
export const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const DESTINOS_IMAGEN = ['productos', 'ofertas', 'banners', 'maquinas'];
export const AYUDA_FORMATOS_IMAGEN = 'Formatos: JPG, PNG, WEBP o AVIF · Máximo 6 MB';

const TIPO_POR_EXTENSION = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };

const tipoDe = (archivo) => {
  if (archivo.type) return archivo.type.toLowerCase();
  const extension = String(archivo.name ?? '').split('.').pop().toLowerCase();
  return TIPO_POR_EXTENSION[extension] ?? '';
};

/** @returns {string} '' si el archivo sirve; si no, el mensaje a mostrar. */
export function validarArchivoImagen(archivo) {
  if (!archivo) return 'Selecciona un archivo de imagen.';
  if (!(archivo.size > 0)) return 'El archivo está vacío.';
  if (!TIPOS_IMAGEN_PERMITIDOS.includes(tipoDe(archivo))) return 'Formato no permitido. Usa JPG, PNG, WEBP o AVIF.';
  if (archivo.size > TAMANO_MAXIMO_IMAGEN_BYTES) return 'La imagen supera el tamaño máximo permitido (6 MB).';
  return '';
}

/**
 * @param {File|Blob} archivo
 * @param {'productos'|'ofertas'|'banners'|'maquinas'} destino
 * @param {string} [nombre] nombre del archivo (para un Blob generado, que no tiene)
 * @returns {Promise<{url:string, destino:string, tipo:string, tamano:number}>} `url` es relativa: guardarla tal cual.
 */
export async function subirImagen(archivo, destino = 'productos', nombre) {
  const mensaje = validarArchivoImagen(archivo);
  if (mensaje) throw new ApiError({ status: 400, mensaje });
  if (!DESTINOS_IMAGEN.includes(destino)) throw new ApiError({ status: 400, mensaje: 'Destino de imagen inválido.' });

  const formData = new FormData();
  if (nombre) formData.append('archivo', archivo, nombre);
  else formData.append('archivo', archivo);
  formData.append('destino', destino);
  return api('/api/v1/imagenes', { metodo: 'POST', formData, tiempoMs: TIEMPO_MAXIMO_SUBIDA_MS });
}
