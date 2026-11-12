// Test: API de productos: arma la consulta sin enviar nunca la categoría "Todas", adapta el DTO (imágenes con urlMedia, precioVenta como precio final) y traduce los errores
// Función: listarProductos(), obtenerProducto(), armarQuery(), adaptarProducto()

import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { listarProductos, obtenerProducto, armarQuery, adaptarProducto, CATEGORIA_TODAS } from '../api/productos.js';
import { API_URL } from '../api/config.js';
import { guardarSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend } from './helpers/fetchMock.js';
import { dtoProducto } from './helpers/fixtures.js';

describe('API de productos', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
  });
  afterEach(() => vi.unstubAllGlobals());

  test('armarQuery: omite lo vacío y NUNCA incluye la categoría "Todas" (en ninguna escritura)', () => {
    expect(armarQuery()).toBe('');
    expect(armarQuery({})).toBe('');
    expect(armarQuery({ categoria: CATEGORIA_TODAS })).toBe('');
    expect(armarQuery({ categoria: 'todas' })).toBe('');
    expect(armarQuery({ categoria: ' TODAS ' })).toBe('');
    expect(armarQuery({ categoria: '', q: '   ', marca: null, sort: undefined })).toBe('');
    expect(armarQuery({ categoria: 'Herramientas' })).toBe('?categoria=Herramientas');
    expect(armarQuery({ q: 'taladro', categoria: 'Todas', sort: 'precio,asc' })).toBe('?q=taladro&sort=precio%2Casc');
    expect(armarQuery({ categoria: 'Gasfitería' })).toBe('?categoria=Gasfiter%C3%ADa');
  });

  test('listarProductos: GET público sin Authorization (aunque haya sesión), devuelve productos adaptados', async () => {
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
    const falso = instalarFetch(() => respuestaJson(200, [dtoProducto(1), dtoProducto(2)]));
    const lista = await listarProductos({ categoria: 'Todas' });
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('GET');
    expect(l.url).toBe(`${API_URL}/api/v1/productos`);
    expect(l.authorization).toBeUndefined();
    expect(lista.map((p) => p.id)).toEqual([1, 2]);
  });

  test('listarProductos: con categoría envía categoria=<nombre> en la consulta', async () => {
    const falso = instalarFetch(() => respuestaJson(200, []));
    await listarProductos({ categoria: 'Maderas' });
    expect(llamadasDe(falso)[0].ruta).toBe('/api/v1/productos?categoria=Maderas');
  });

  test('listarProductos: una respuesta que no es lista da [] y un 400 del backend llega como ApiError', async () => {
    instalarFetch(() => respuestaJson(200, null));
    expect(await listarProductos()).toEqual([]);
    instalarFetch(() => errorBackend(400, 'Categoría inválida. Valores permitidos: Construcción, Maderas'));
    const error = await listarProductos({ categoria: 'Foo' }).catch((e) => e);
    expect(error.status).toBe(400);
    expect(error.mensaje).toContain('Categoría inválida');
  });

  test('adaptarProducto: imágenes con urlMedia, precioVenta tal cual, oferta nula se conserva y faltantes quedan con valores seguros', () => {
    const p = adaptarProducto(dtoProducto(7, { precioVenta: 129990, imagenOfertaUrl: '/media/ofertas/x.webp' }));
    expect(p.id).toBe(7);
    expect(p.sku).toBe('5422223207');
    expect(p.precioVenta).toBe(129990);
    expect(p.imagen).toBe(`${API_URL}/media/productos/p7.webp`);
    expect(p.imagenOferta).toBe(`${API_URL}/media/ofertas/x.webp`);

    const sinOferta = adaptarProducto(dtoProducto(8));
    expect(sinOferta.imagenOferta).toBeNull();

    const minimo = adaptarProducto({ id: 9, sku: 's', nombre: 'n', precioVenta: 1, stock: 0, estado: 'AGOTADO', imagenUrl: null, descripcion: null, especificaciones: null });
    expect(minimo.imagen).toBe('/banner-web.webp');
    expect(minimo.descripcion).toBe('');
    expect(minimo.especificaciones).toEqual({});
  });

  test('obtenerProducto: GET /productos/{id}; el 404 del backend llega como ApiError con su mensaje', async () => {
    const falso = instalarFetch(() => respuestaJson(200, dtoProducto(5)));
    const p = await obtenerProducto(5);
    expect(llamadasDe(falso)[0].ruta).toBe('/api/v1/productos/5');
    expect(p.nombre).toBe('Producto 5');

    instalarFetch(() => errorBackend(404, 'Producto no encontrado: 99'));
    const error = await obtenerProducto(99).catch((e) => e);
    expect(error.status).toBe(404);
    expect(error.mensaje).toBe('Producto no encontrado: 99');
  });
});
