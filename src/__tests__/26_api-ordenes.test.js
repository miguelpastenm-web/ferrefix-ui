// Test: API de órdenes: crea la orden enviando solo producto y cantidad (nunca precios), y traduce 400, 403, 404 y 409 con sus detalles; lista las compras del cliente
// Función: crearOrden(), misOrdenes(), obtenerOrden()

import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { crearOrden, misOrdenes, obtenerOrden } from '../api/ordenes.js';
import { guardarSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend } from './helpers/fetchMock.js';
import { dtoOrden } from './helpers/fixtures.js';

const DATOS = {
  items: [
    { productoId: 3, cantidad: 2, precioVenta: 1, nombre: 'Hackeado', sku: 'x', stock: 9 },
    { productoId: 5, cantidad: 1 }
  ],
  metodoPago: 'TARJETA_CREDITO',
  telefono: ' +56 9 8765 4321 ',
  direccionEnvio: '  Av. Siempre Viva 742 ',
  region: 'Región Metropolitana',
  comuna: 'Santiago',
  indicaciones: '   ',
  precioTotal: 1, total: 1, costoEnvio: 0
};

describe('API de órdenes', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
  });
  afterEach(() => vi.unstubAllGlobals());

  test('crearOrden: POST /ordenes con Bearer y SOLO productoId y cantidad por línea; sin precios, totales ni indicaciones vacías', async () => {
    const falso = instalarFetch(() => respuestaJson(201, dtoOrden()));
    const orden = await crearOrden(DATOS);
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('POST');
    expect(l.ruta).toBe('/api/v1/ordenes');
    expect(l.authorization).toBe('Bearer tok');
    expect(l.cuerpo).toEqual({
      items: [{ productoId: 3, cantidad: 2 }, { productoId: 5, cantidad: 1 }],
      metodoPago: 'TARJETA_CREDITO',
      telefono: '+56 9 8765 4321',
      direccionEnvio: 'Av. Siempre Viva 742',
      region: 'Región Metropolitana',
      comuna: 'Santiago'
    });
    expect(orden.boleta).toBe('BOL-000012');
  });

  test('crearOrden: con indicaciones reales las envía recortadas', async () => {
    const falso = instalarFetch(() => respuestaJson(201, dtoOrden()));
    await crearOrden({ ...DATOS, indicaciones: ' Dejar con conserje ' });
    expect(llamadasDe(falso)[0].cuerpo.indicaciones).toBe('Dejar con conserje');
  });

  test.each([
    [400, 'Datos de entrada inválidos', ['telefono: El teléfono solo admite números, +, espacios, guiones y paréntesis (8 a 20 caracteres)']],
    [403, 'No tienes permisos para acceder a este recurso', undefined],
    [404, 'Producto no encontrado: [5]', undefined],
    [409, 'No hay stock suficiente para completar la compra. No se descontó nada', ['Esmeril (SKU 5422223203): agotado', 'Sierra (SKU 5422223204): disponibles 3, solicitaste 5']]
  ])('crearOrden: el %i del backend llega como ApiError con su mensaje y sus detalles', async (status, mensaje, detalles) => {
    instalarFetch(() => errorBackend(status, mensaje, detalles));
    const error = await crearOrden(DATOS).catch((e) => e);
    expect(error.status).toBe(status);
    expect(error.mensaje).toBe(mensaje);
    expect(error.detalles).toEqual(detalles ?? []);
  });

  test('misOrdenes: GET /ordenes/mis-ordenes con Bearer, conserva el orden del servidor y una respuesta rara da []', async () => {
    const falso = instalarFetch(() => respuestaJson(200, [dtoOrden({ id: 9, codigo: 'ORD-000009' }), dtoOrden({ id: 8, codigo: 'ORD-000008' })]));
    const lista = await misOrdenes();
    const [l] = llamadasDe(falso);
    expect(l.ruta).toBe('/api/v1/ordenes/mis-ordenes');
    expect(l.authorization).toBe('Bearer tok');
    expect(lista.map((o) => o.codigo)).toEqual(['ORD-000009', 'ORD-000008']);
    instalarFetch(() => respuestaJson(200, null));
    expect(await misOrdenes()).toEqual([]);
  });

  test('obtenerOrden: GET /ordenes/{id}; una orden ajena responde 404', async () => {
    const falso = instalarFetch(() => respuestaJson(200, dtoOrden()));
    await obtenerOrden(12);
    expect(llamadasDe(falso)[0].ruta).toBe('/api/v1/ordenes/12');
    instalarFetch(() => errorBackend(404, 'Orden no encontrada: 7'));
    expect((await obtenerOrden(7).catch((e) => e)).status).toBe(404);
  });
});
