import { API_URL } from './config';

export const IMAGEN_POR_DEFECTO = '/banner-web.webp';

/**
 * URL lista para un <img src>. El backend guarda rutas relativas ("/media/productos/xxx.webp") para que no dependan
 * de la IP del servidor; aquí se les antepone la URL de la API.
 *  - sin imagen            -> imagen por defecto del sitio
 *  - "/media/..."          -> API_URL + ruta
 *  - http(s):, data:, blob: -> se deja tal cual
 *  - cualquier otra ruta   -> se deja tal cual (assets del propio front)
 */
export function urlMedia(ruta) {
  if (typeof ruta !== 'string' || !ruta.trim()) return IMAGEN_POR_DEFECTO;
  const limpia = ruta.trim();
  if (/^(https?:|data:|blob:)/i.test(limpia)) return limpia;
  if (limpia.startsWith('/media/')) return `${API_URL}${limpia}`;
  return limpia;
}
