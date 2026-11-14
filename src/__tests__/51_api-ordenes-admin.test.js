// Test: API de órdenes (ADMIN): lista órdenes con filtros opcionales, cambia estado con PATCH y elimina con DELETE
// Función: listarOrdenes(), cambiarEstadoOrden(), eliminarOrden(), armarQueryOrdenes()

import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { listarOrdenes, cambiarEstadoOrden, eliminarOrden, armarQueryOrdenes } from '../api/ordenes.js';
import { guardarSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend } from './helpers/fetchMock.js';
import { dtoOrden } from './helpers/fixtures.js';

describe('API de órdenes — funciones ADMIN', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
    guardarSesion({ accessToken: 'tok-admin', refreshToken: 'r-admin' });
  });
  afterEach(() => vi.unstubAllGlobals());

  test('armarQueryOrdenes: omite vacíos y "Todos", incluye estado y usuarioId', () => {
    expect(armarQueryOrdenes()).toBe('');
    expect(armarQueryOrdenes({ estado: 'Todos', usuarioId: '' })).toBe('');
    expect(armarQueryOrdenes({ estado: 'PAGADA' })).toBe('?estado=PAGADA');
    expect(armarQueryOrdenes({ estado: 'DESPACHADA', usuarioId: 14 })).toBe('?estado=DESPACHADA&usuarioId=14');
  });

  test('listarOrdenes: GET /ordenes con Bearer y filtros; respuesta no-array devuelve []', async () => {
    const falso = instalarFetch(() => respuestaJson(200, [dtoOrden({ id: 20 })]));
    const lista = await listarOrdenes({ estado: 'PAGADA', usuarioId: 5 });
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('GET');
    expect(l.ruta).toBe('/api/v1/ordenes?estado=PAGADA&usuarioId=5');
    expect(l.authorization).toBe('Bearer tok-admin');
    expect(lista).toHaveLength(1);

    instalarFetch(() => respuestaJson(200, null));
    expect(await listarOrdenes()).toEqual([]);
  });

  test('cambiarEstadoOrden: PATCH /ordenes/{id}/estado con { estado } y Bearer', async () => {
    const falso = instalarFetch(() => respuestaJson(200, dtoOrden({ id: 12, estado: 'EN_PREPARACION' })));
    const res = await cambiarEstadoOrden(12, 'EN_PREPARACION');
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('PATCH');
    expect(l.ruta).toBe('/api/v1/ordenes/12/estado');
    expect(l.authorization).toBe('Bearer tok-admin');
    expect(l.cuerpo).toEqual({ estado: 'EN_PREPARACION' });
    expect(res.estado).toBe('EN_PREPARACION');
  });

  test('eliminarOrden: DELETE /ordenes/{id} con Bearer y maneja 204', async () => {
    const falso = instalarFetch(() => respuestaJson(204));
    await expect(eliminarOrden(12)).resolves.toBeUndefined();
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('DELETE');
    expect(l.ruta).toBe('/api/v1/ordenes/12');
    expect(l.authorization).toBe('Bearer tok-admin');
  });

  test('errores 403, 404 y 409 llegan como ApiError con su estado y mensaje', async () => {
    instalarFetch(() => errorBackend(409, 'Transición no permitida: DESPACHADA → CANCELADA'));
    const err409 = await cambiarEstadoOrden(12, 'CANCELADA').catch((e) => e);
    expect(err409.status).toBe(409);
    expect(err409.mensaje).toMatch(/Transición no permitida/);

    instalarFetch(() => errorBackend(404, 'Orden no encontrada: 99'));
    const err404 = await eliminarOrden(99).catch((e) => e);
    expect(err404.status).toBe(404);
  });
});

