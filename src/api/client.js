// Cliente HTTP central. TODAS las llamadas al backend pasan por aquí.
//
//  - Devuelve el JSON de la respuesta (o null en 204) y lanza ApiError ante cualquier fallo.
//  - Agrega "Authorization: Bearer <accessToken>" salvo que la llamada pida { auth: false }.
//  - Ante un 401 en una ruta protegida intenta renovar la sesión UNA vez (/auth/refresh, con una sola renovación
//    en vuelo aunque fallen varias peticiones a la vez) y reintenta la petición UNA vez. Si la renovación es
//    rechazada, borra la sesión y avisa a la aplicación (alSesionInvalida); no hay bucles.

import { API_URL, TIEMPO_MAXIMO_MS } from './config';
import { ApiError, MENSAJE_SIN_CONEXION, MENSAJE_TIEMPO_AGOTADO } from './errores';
import { leerSesion, guardarSesion, borrarSesion } from './sesionAlmacen';

/** Rutas que NUNCA disparan una renovación (un 401 ahí es la respuesta definitiva, p. ej. "Credenciales inválidas"). */
const RUTAS_SIN_RENOVACION = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh'];

let alSesionInvalida = () => {};

/** La aplicación (AuthProvider) registra aquí qué hacer cuando la sesión ya no se puede renovar. */
export function configurarCliente({ alSesionInvalida: callback } = {}) {
  alSesionInvalida = typeof callback === 'function' ? callback : () => {};
}

/**
 * Un solo intento de HTTP, sin renovación. Lanza ApiError.
 * @param {string} ruta ruta absoluta del backend, p. ej. "/api/v1/productos"
 * @param {{metodo?:string, cuerpo?:any, formData?:FormData, auth?:boolean, signal?:AbortSignal, tiempoMs?:number}} opciones
 *        tiempoMs: espera máxima (por defecto TIEMPO_MAXIMO_MS; las subidas de imágenes usan más).
 */
async function peticion(ruta, { metodo = 'GET', cuerpo, formData, auth = true, signal, tiempoMs = TIEMPO_MAXIMO_MS } = {}) {
  const url = /^https?:\/\//i.test(ruta) ? ruta : `${API_URL}${ruta}`;
  const cabeceras = { Accept: 'application/json' };
  let body;
  if (formData) {
    body = formData; // el navegador agrega Content-Type con el boundary
  } else if (cuerpo !== undefined) {
    cabeceras['Content-Type'] = 'application/json';
    body = JSON.stringify(cuerpo);
  }
  if (auth) {
    const sesion = leerSesion();
    if (sesion?.accessToken) cabeceras.Authorization = `Bearer ${sesion.accessToken}`;
  }

  const controlador = new AbortController();
  let venció = false;
  const temporizador = setTimeout(() => {
    venció = true;
    controlador.abort();
  }, tiempoMs);
  if (signal) {
    if (signal.aborted) controlador.abort();
    else signal.addEventListener('abort', () => controlador.abort(), { once: true });
  }

  let respuesta;
  try {
    respuesta = await fetch(url, { method: metodo, headers: cabeceras, body, signal: controlador.signal });
  } catch (error) {
    clearTimeout(temporizador);
    if (venció) throw new ApiError({ status: 0, mensaje: MENSAJE_TIEMPO_AGOTADO, ruta, tiempoAgotado: true });
    if (signal?.aborted) throw error; // cancelada por quien llamó: no es un fallo de red
    throw new ApiError({ status: 0, mensaje: MENSAJE_SIN_CONEXION, ruta });
  }
  clearTimeout(temporizador);

  const texto = respuesta.status === 204 ? '' : await respuesta.text();
  let datos = null;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = null; // cuerpo que no es JSON (p. ej. una página de error de un proxy)
    }
  }

  if (!respuesta.ok) {
    throw new ApiError({
      status: respuesta.status,
      mensaje: typeof datos?.message === 'string' && datos.message ? datos.message : undefined,
      detalles: datos?.details,
      ruta
    });
  }
  return datos;
}

// ---------------------------------------------------------------- renovación de sesión
let renovacionEnVuelo = null;

/**
 * Renueva el par de tokens con el refresh token guardado.
 * @returns {Promise<'ok'|'rechazada'|'sin-sesion'>} 'rechazada' = el servidor no aceptó el refresh token.
 *          Si no se pudo ni consultar al servidor (red caída, 5xx) lanza el ApiError correspondiente.
 */
export function renovarSesion() {
  if (!renovacionEnVuelo) {
    renovacionEnVuelo = ejecutarRenovacion().finally(() => {
      renovacionEnVuelo = null;
    });
  }
  return renovacionEnVuelo;
}

async function ejecutarRenovacion() {
  const sesion = leerSesion();
  if (!sesion?.refreshToken) return 'sin-sesion';
  try {
    const tokens = await peticion('/api/v1/auth/refresh', {
      metodo: 'POST',
      cuerpo: { refreshToken: sesion.refreshToken },
      auth: false
    });
    guardarSesion({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    return 'ok';
  } catch (error) {
    if (error instanceof ApiError && !error.esTransitorio) return 'rechazada'; // 400/401/403/404: el refresh ya no sirve
    throw error; // red caída o 5xx: no se puede concluir que la sesión murió
  }
}

function cerrarSesionLocal() {
  borrarSesion();
  alSesionInvalida();
}

// ---------------------------------------------------------------- API pública
/**
 * Llamada al backend con renovación automática de sesión (ver cabecera del archivo).
 * @param {string} ruta
 * @param {{metodo?:string, cuerpo?:any, formData?:FormData, auth?:boolean, signal?:AbortSignal}} [opciones]
 */
export async function api(ruta, opciones = {}) {
  const tokenUsado = leerSesion()?.accessToken;
  try {
    return await peticion(ruta, opciones);
  } catch (error) {
    const esNoAutorizado = error instanceof ApiError && error.status === 401;
    const puedeRenovar = esNoAutorizado && opciones.auth !== false && !RUTAS_SIN_RENOVACION.includes(ruta) && Boolean(tokenUsado);
    if (!puedeRenovar || !leerSesion()?.refreshToken) throw error;

    // Otra petición ya renovó los tokens mientras ésta volaba: basta reintentar con el token nuevo.
    if (leerSesion()?.accessToken === tokenUsado) {
      const resultado = await renovarSesion(); // si falla por red/5xx, ese error sale tal cual
      if (resultado !== 'ok') {
        cerrarSesionLocal();
        throw error;
      }
    }

    // Segundo y ÚLTIMO intento: aunque vuelva a dar 401, no se renueva otra vez.
    try {
      return await peticion(ruta, opciones);
    } catch (errorReintento) {
      if (errorReintento instanceof ApiError && errorReintento.status === 401) cerrarSesionLocal();
      throw errorReintento;
    }
  }
}
