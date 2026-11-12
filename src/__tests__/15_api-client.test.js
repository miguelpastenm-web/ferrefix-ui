// Test: Cliente HTTP central: arma la petición, traduce los errores del backend a ApiError y renueva la sesión UNA sola vez (compartida entre peticiones simultáneas), sin bucles
// Función: api(), renovarSesion(), configurarCliente()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, configurarCliente } from '../api/client.js';
import { API_URL, TIEMPO_MAXIMO_MS } from '../api/config.js';
import { ApiError, MENSAJE_SIN_CONEXION, MENSAJE_TIEMPO_AGOTADO } from '../api/errores.js';
import { guardarSesion, leerSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, diferido, tokensDe, USUARIO_CLIENTE } from './helpers/fetchMock.js';

const conSesion = () => guardarSesion({ accessToken: 'viejo', refreshToken: 'refresh-1' });
const TOKENS_NUEVOS = tokensDe(USUARIO_CLIENTE, 'nuevo', 'refresh-2');

/** Servidor falso: /protegido acepta solo el token 'nuevo'; /auth/refresh entrega TOKENS_NUEVOS. */
const servidorConTokenVencido = () =>
  instalarFetch((l) => {
    if (l.ruta === '/api/v1/auth/refresh') return respuestaJson(200, TOKENS_NUEVOS);
    return l.authorization === 'Bearer nuevo' ? respuestaJson(200, { ok: true }) : errorBackend(401, 'Token ausente, inválido o vencido');
  });

describe('Cliente HTTP — petición y respuesta', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
    configurarCliente({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test('api: arma la URL con VITE_API_URL, devuelve el JSON y no manda Authorization si no hay sesión', async () => {
    const falso = instalarFetch(() => respuestaJson(200, [{ id: 1 }]));
    const datos = await api('/api/v1/productos');
    expect(datos).toEqual([{ id: 1 }]);
    const [llamada] = llamadasDe(falso);
    expect(llamada.url).toBe(`${API_URL}/api/v1/productos`);
    expect(llamada.metodo).toBe('GET');
    expect(llamada.authorization).toBeUndefined();
    expect(llamada.cabeceras.Accept).toBe('application/json');
  });

  test('api: envía el cuerpo como JSON con Content-Type, y el Bearer cuando hay sesión (auth:false lo omite)', async () => {
    conSesion();
    const falso = instalarFetch(() => respuestaJson(200, {}));
    await api('/api/v1/users/me', { metodo: 'PUT', cuerpo: { nombre: 'Ana' } });
    await api('/api/v1/auth/login', { metodo: 'POST', cuerpo: { email: 'a@b.cl' }, auth: false });
    const [conToken, sinToken] = llamadasDe(falso);
    expect(conToken.metodo).toBe('PUT');
    expect(conToken.cuerpo).toEqual({ nombre: 'Ana' });
    expect(conToken.cabeceras['Content-Type']).toBe('application/json');
    expect(conToken.authorization).toBe('Bearer viejo');
    expect(sinToken.authorization).toBeUndefined();
  });

  test('api: un 204 devuelve null y un FormData se envía tal cual, sin fijar Content-Type (lo pone el navegador)', async () => {
    instalarFetch((l) => (l.metodo === 'DELETE' ? respuestaJson(204) : respuestaJson(201, { url: '/media/productos/x.webp' })));
    expect(await api('/api/v1/productos/5', { metodo: 'DELETE' })).toBeNull();

    const formData = new FormData();
    formData.append('destino', 'productos');
    const falso = instalarFetch(() => respuestaJson(201, { url: '/media/productos/x.webp' }));
    const resultado = await api('/api/v1/imagenes', { metodo: 'POST', formData });
    expect(resultado.url).toBe('/media/productos/x.webp');
    const [llamada] = llamadasDe(falso);
    expect(llamada.init.body).toBe(formData);
    expect(llamada.cabeceras['Content-Type']).toBeUndefined();
  });

  test('api: traduce 400, 403, 404, 409 y 500 a ApiError con el status, el mensaje y los detalles del backend', async () => {
    const casos = [
      [400, 'Datos de entrada inválidos', ['email: El correo debe tener un formato válido']],
      [403, 'No tienes permisos para acceder a este recurso', undefined],
      [404, 'Producto no encontrado: 9', undefined],
      [409, 'No hay stock suficiente para completar la compra. No se descontó nada', ['Esmeril (SKU 5422223216): agotado']],
      [500, 'Error interno del servidor', undefined]
    ];
    for (const [status, mensaje, detalles] of casos) {
      instalarFetch(() => errorBackend(status, mensaje, detalles));
      const error = await api('/api/v1/x').catch((e) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(status);
      expect(error.mensaje).toBe(mensaje);
      expect(error.detalles).toEqual(detalles ?? []);
      expect(error.ruta).toBe('/api/v1/x');
    }
  });

  test('api: si el cuerpo del error no es JSON (p. ej. una página 502 de un proxy) usa el mensaje por defecto del estado', async () => {
    instalarFetch(() => new Response('<html>Bad Gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } }));
    const error = await api('/api/v1/x').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
    expect(error.mensaje).toContain('Error del servidor');
    expect(error.detalles).toEqual([]);
  });

  test('api: si no hay conexión lanza ApiError con status 0 y mensaje claro, sin intentar renovar la sesión', async () => {
    conSesion();
    const falso = instalarFetch(() => new TypeError('Failed to fetch'));
    const error = await api('/api/v1/x').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.esDeRed).toBe(true);
    expect(error.mensaje).toBe(MENSAJE_SIN_CONEXION);
    expect(error.tiempoAgotado).toBe(false);
    expect(falso).toHaveBeenCalledTimes(1);
    expect(leerSesion()).not.toBeNull();
  });

  test('api: si el servidor no responde en el tiempo máximo cancela la petición y lanza ApiError de tiempo agotado', async () => {
    vi.useFakeTimers();
    instalarFetch(
      (l) =>
        new Promise((_, rechazar) => {
          l.init.signal.addEventListener('abort', () => rechazar(new DOMException('Aborted', 'AbortError')));
        })
    );
    const resultado = api('/api/v1/lento').catch((e) => e);
    await vi.advanceTimersByTimeAsync(TIEMPO_MAXIMO_MS + 1);
    const error = await resultado;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.tiempoAgotado).toBe(true);
    expect(error.mensaje).toBe(MENSAJE_TIEMPO_AGOTADO);
  });
});

describe('Cliente HTTP — renovación de sesión', () => {
  let alSesionInvalida;

  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
    alSesionInvalida = vi.fn();
    configurarCliente({ alSesionInvalida });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    configurarCliente({});
  });

  test('Un 401 en una ruta protegida renueva UNA vez con el refresh token y reintenta con el token nuevo', async () => {
    conSesion();
    const falso = servidorConTokenVencido();

    const datos = await api('/api/v1/productos', { metodo: 'POST', cuerpo: { a: 1 } });

    expect(datos).toEqual({ ok: true });
    const llamadas = llamadasDe(falso);
    expect(llamadas.map((l) => `${l.metodo} ${l.ruta} ${l.authorization ?? '-'}`)).toEqual([
      'POST /api/v1/productos Bearer viejo',
      'POST /api/v1/auth/refresh -',
      'POST /api/v1/productos Bearer nuevo'
    ]);
    expect(llamadas[1].cuerpo).toEqual({ refreshToken: 'refresh-1' });
    expect(llamadas[2].cuerpo).toEqual({ a: 1 }); // el reintento repite el mismo cuerpo
    expect(leerSesion()).toEqual({ accessToken: 'nuevo', refreshToken: 'refresh-2' });
    expect(alSesionInvalida).not.toHaveBeenCalled();
  });

  test('Si el reintento TAMBIÉN da 401: una sola renovación, sesión borrada, aviso a la aplicación y ese 401 (sin bucle)', async () => {
    conSesion();
    const falso = instalarFetch((l) =>
      l.ruta === '/api/v1/auth/refresh' ? respuestaJson(200, TOKENS_NUEVOS) : errorBackend(401, 'Token ausente, inválido o vencido')
    );

    const error = await api('/api/v1/productos').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(falso).toHaveBeenCalledTimes(3); // petición, refresh, reintento: nada más
    expect(leerSesion()).toBeNull();
    expect(alSesionInvalida).toHaveBeenCalledTimes(1);
  });

  test('Si el servidor RECHAZA la renovación: sesión borrada, aviso, 401 original y la petición NO se reintenta', async () => {
    conSesion();
    const falso = instalarFetch((l) =>
      l.ruta === '/api/v1/auth/refresh' ? errorBackend(401, 'Refresh token inválido o vencido') : errorBackend(401, 'Token ausente, inválido o vencido')
    );

    const error = await api('/api/v1/productos').catch((e) => e);

    expect(error.status).toBe(401);
    expect(error.mensaje).toBe('Token ausente, inválido o vencido');
    expect(llamadasDe(falso).map((l) => l.ruta)).toEqual(['/api/v1/productos', '/api/v1/auth/refresh']);
    expect(leerSesion()).toBeNull();
    expect(alSesionInvalida).toHaveBeenCalledTimes(1);
  });

  test('Si la renovación no puede ni consultarse (red caída o 5xx) la sesión se CONSERVA y se informa el fallo de red', async () => {
    conSesion();
    instalarFetch((l) => (l.ruta === '/api/v1/auth/refresh' ? new TypeError('Failed to fetch') : errorBackend(401, 'vencido')));
    const errorDeRed = await api('/api/v1/productos').catch((e) => e);
    expect(errorDeRed.status).toBe(0);
    expect(leerSesion()).toEqual({ accessToken: 'viejo', refreshToken: 'refresh-1' });

    instalarFetch((l) => (l.ruta === '/api/v1/auth/refresh' ? errorBackend(503, 'no disponible') : errorBackend(401, 'vencido')));
    const errorDe5xx = await api('/api/v1/productos').catch((e) => e);
    expect(errorDe5xx.status).toBe(503);
    expect(leerSesion()).not.toBeNull();
    expect(alSesionInvalida).not.toHaveBeenCalled();
  });

  test('login, register y refresh NUNCA disparan renovación (su 401 es la respuesta final), ni tampoco auth:false', async () => {
    conSesion();
    const falso = instalarFetch(() => errorBackend(401, 'Credenciales inválidas'));
    for (const ruta of ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh']) {
      const error = await api(ruta, { metodo: 'POST', cuerpo: {}, auth: false }).catch((e) => e);
      expect(error.status).toBe(401);
    }
    const sinAuth = await api('/api/v1/publica', { auth: false }).catch((e) => e);
    expect(sinAuth.status).toBe(401);
    expect(falso).toHaveBeenCalledTimes(4);
    expect(leerSesion()).not.toBeNull();
    expect(alSesionInvalida).not.toHaveBeenCalled();
  });

  test('Sin sesión (visitante) un 401 se entrega tal cual: no hay nada que renovar ni que cerrar', async () => {
    const falso = instalarFetch(() => errorBackend(401, 'Token ausente, inválido o vencido'));
    const error = await api('/api/v1/ordenes/mis-ordenes').catch((e) => e);
    expect(error.status).toBe(401);
    expect(falso).toHaveBeenCalledTimes(1);
    expect(alSesionInvalida).not.toHaveBeenCalled();
  });

  test('Varias peticiones que reciben 401 al mismo tiempo comparten UNA sola renovación y todas se reintentan con el token nuevo', async () => {
    conSesion();
    let renovaciones = 0;
    const falso = instalarFetch(async (l) => {
      if (l.ruta === '/api/v1/auth/refresh') {
        renovaciones += 1;
        await new Promise((r) => setTimeout(r, 15)); // da tiempo a que las otras dos también fallen
        return respuestaJson(200, TOKENS_NUEVOS);
      }
      return l.authorization === 'Bearer nuevo' ? respuestaJson(200, { ruta: l.ruta }) : errorBackend(401, 'vencido');
    });

    const resultados = await Promise.all([api('/api/v1/a'), api('/api/v1/b'), api('/api/v1/c')]);

    expect(resultados.map((r) => r.ruta)).toEqual(['/api/v1/a', '/api/v1/b', '/api/v1/c']);
    expect(renovaciones).toBe(1);
    expect(llamadasDe(falso).filter((l) => l.ruta === '/api/v1/auth/refresh')).toHaveLength(1);
    expect(llamadasDe(falso)).toHaveLength(7); // 3 intentos + 1 renovación + 3 reintentos
    expect(alSesionInvalida).not.toHaveBeenCalled();
  });

  test('Una petición cuyo 401 llega DESPUÉS de que otra ya renovó los tokens se reintenta sin renovar de nuevo', async () => {
    conSesion();
    const liberarA = diferido();
    let renovaciones = 0;
    instalarFetch(async (l) => {
      if (l.ruta === '/api/v1/auth/refresh') {
        renovaciones += 1;
        return respuestaJson(200, TOKENS_NUEVOS);
      }
      if (l.authorization === 'Bearer nuevo') return respuestaJson(200, { ruta: l.ruta });
      if (l.ruta === '/api/v1/a') await liberarA.promesa; // A "tarda" en recibir su 401
      return errorBackend(401, 'vencido');
    });

    const peticionA = api('/api/v1/a');
    const resultadoB = await api('/api/v1/b'); // B falla, renueva y termina antes de que A reciba su 401
    expect(resultadoB.ruta).toBe('/api/v1/b');
    expect(renovaciones).toBe(1);

    liberarA.resolver();
    expect((await peticionA).ruta).toBe('/api/v1/a');
    expect(renovaciones).toBe(1); // A no renovó otra vez
  });
});
