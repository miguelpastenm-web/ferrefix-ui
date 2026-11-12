// Configuración de la capa de API.

/** URL por defecto SOLO para desarrollo y tests. El build de producción exige VITE_API_URL (ver vite.config.js). */
export const API_URL_POR_DEFECTO = 'http://localhost:8080';

/** Tiempo máximo de espera de una petición. */
export const TIEMPO_MAXIMO_MS = 15000;

/** Recorta espacios y quita barras finales: "http://x:8080/ " -> "http://x:8080". */
export const normalizarUrlBase = (valor) => String(valor ?? '').trim().replace(/\/+$/, '');

export const API_URL = normalizarUrlBase(import.meta.env.VITE_API_URL) || API_URL_POR_DEFECTO;
