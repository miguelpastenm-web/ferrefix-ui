// Utilidades de test: un `fetch` falso que registra las llamadas. (No es un test: Vitest solo ejecuta *.test.*)
import { vi } from 'vitest';
import { API_URL } from '../../api/config.js';

/** Respuesta JSON como la que da el backend. `cuerpo` undefined => sin cuerpo (p. ej. 204). */
export const respuestaJson = (status, cuerpo) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

/** Error en el formato del backend (ErrorResponseDto). */
export const errorBackend = (status, message, details) =>
  respuestaJson(status, { timestamp: '2026-11-12T10:00:00', status, error: 'Error', message, path: '/x', ...(details ? { details } : {}) });

export function describirLlamada(url, init = {}) {
  let cuerpo = init.body;
  if (typeof init.body === 'string') {
    try {
      cuerpo = JSON.parse(init.body);
    } catch {
      cuerpo = init.body;
    }
  }
  return {
    url: String(url),
    ruta: String(url).replace(API_URL, ''),
    metodo: init.method ?? 'GET',
    authorization: init.headers?.Authorization,
    cabeceras: init.headers ?? {},
    cuerpo,
    init
  };
}

/**
 * Instala un `fetch` falso. `manejador(llamada)` devuelve una Response, un Error (el fetch rechaza, como una red
 * caída) o una promesa de cualquiera de las dos.
 */
export function instalarFetch(manejador) {
  const falso = vi.fn(async (url, init) => {
    const resultado = await manejador(describirLlamada(url, init));
    if (resultado instanceof Error) throw resultado;
    return resultado;
  });
  vi.stubGlobal('fetch', falso);
  return falso;
}

export const llamadasDe = (falso) => falso.mock.calls.map(([url, init]) => describirLlamada(url, init));

/** Promesa que se resuelve a mano: sirve para controlar el orden en que "responde el servidor". */
export function diferido() {
  let resolver;
  const promesa = new Promise((resolve) => {
    resolver = resolve;
  });
  return { promesa, resolver };
}

/** Respuestas típicas de los endpoints de autenticación. */
export const USUARIO_CLIENTE = {
  id: 2, rut: '15432890-4', nombre: 'Juan Maestro', email: 'cliente@ferrefix.cl', telefono: null, direccion: null,
  region: null, comuna: null, activo: true, roles: ['CLIENTE'], createdAt: '2026-01-01T10:00:00'
};
export const USUARIO_ADMIN = {
  id: 1, rut: '11111111-1', nombre: 'Administrador Ferrefix', email: 'admin@ferrefix.cl', telefono: null, direccion: null,
  region: null, comuna: null, activo: true, roles: ['ADMIN'], createdAt: '2026-01-01T10:00:00'
};
export const tokensDe = (usuario, access = 'access-1', refresh = 'refresh-1') => ({
  accessToken: access, refreshToken: refresh, tokenType: 'Bearer', expiresIn: 900, usuario
});
