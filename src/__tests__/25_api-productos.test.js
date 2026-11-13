// Test: API de productos: arma la consulta sin enviar nunca la categoría "Todas", adapta el DTO (imágenes con urlMedia, precioVenta como precio final), traduce los errores y crea, edita y elimina como ADMIN
// Función: listarProductos(), obtenerProducto(), armarQuery(), adaptarProducto(), crearProducto(), actualizarProducto(), eliminarProducto()

import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { listarProductos, obtenerProducto, armarQuery, adaptarProducto, crearProducto, actualizarProducto, eliminarProducto, CATEGORIA_TODAS } from '../api/productos.js';
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

  test('adaptarProducto: además de la imagen lista para mostrar conserva las rutas RELATIVAS del backend (las que se reenvían al editar)', () => {
    const p = adaptarProducto(dtoProducto(7, { imagenOfertaUrl: '/media/ofertas/x.webp' }));
    expect(p.imagenUrl).toBe('/media/productos/p7.webp');
    expect(p.imagenOfertaUrl).toBe('/media/ofertas/x.webp');
    expect(adaptarProducto(dtoProducto(8)).imagenOfertaUrl).toBeNull();
  });

  const DTO = { sku: 'ABC-1', nombre: 'Taladro', marca: 'Bosch', categoria: 'Herramientas', precioVenta: 1000, stock: 3, descripcion: null, imagenUrl: null, imagenOfertaUrl: null, especificaciones: { Potencia: '800 W' } };

  test('crearProducto (ADMIN): POST /productos con Bearer y el DTO tal cual; devuelve el producto adaptado', async () => {
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
    const falso = instalarFetch(() => respuestaJson(201, dtoProducto(20, { sku: 'ABC-1' })));
    const creado = await crearProducto(DTO);
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('POST');
    expect(l.ruta).toBe('/api/v1/productos');
    expect(l.authorization).toBe('Bearer tok');
    expect(l.cuerpo).toEqual(DTO);
    expect(creado.id).toBe(20);
    expect(creado.imagen).toBe(`${API_URL}/media/productos/p20.webp`);
  });

  test('crearProducto: el 409 por SKU repetido y el 400 con detalles llegan como ApiError', async () => {
    instalarFetch(() => errorBackend(409, 'Ya existe un producto con el SKU ABC-1'));
    const repetido = await crearProducto(DTO).catch((e) => e);
    expect(repetido.status).toBe(409);
    expect(repetido.mensaje).toBe('Ya existe un producto con el SKU ABC-1');
    instalarFetch(() => errorBackend(400, 'Datos de entrada inválidos', ['precioVenta: El precio debe ser mayor a 0']));
    const invalido = await crearProducto({ ...DTO, precioVenta: 0 }).catch((e) => e);
    expect(invalido.status).toBe(400);
    expect(invalido.detalles).toEqual(['precioVenta: El precio debe ser mayor a 0']);
  });

  test('actualizarProducto: PUT /productos/{id} con el producto completo; 404 y 409 llegan como ApiError', async () => {
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
    const falso = instalarFetch(() => respuestaJson(200, dtoProducto(5, { nombre: 'Nuevo' })));
    const p = await actualizarProducto(5, DTO);
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('PUT');
    expect(l.ruta).toBe('/api/v1/productos/5');
    expect(l.authorization).toBe('Bearer tok');
    expect(l.cuerpo).toEqual(DTO);
    expect(p.nombre).toBe('Nuevo');
    instalarFetch(() => errorBackend(404, 'Producto no encontrado: 5'));
    expect((await actualizarProducto(5, DTO).catch((e) => e)).status).toBe(404);
    instalarFetch(() => errorBackend(409, 'Ya existe otro producto con el SKU ABC-1'));
    expect((await actualizarProducto(5, DTO).catch((e) => e)).status).toBe(409);
  });

  test('eliminarProducto: DELETE /productos/{id} (204 sin cuerpo) y el 404 llega como ApiError', async () => {
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
    const falso = instalarFetch(() => respuestaJson(204));
    expect(await eliminarProducto(5)).toBeUndefined();
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('DELETE');
    expect(l.ruta).toBe('/api/v1/productos/5');
    expect(l.authorization).toBe('Bearer tok');
    instalarFetch(() => errorBackend(404, 'Producto no encontrado: 5'));
    expect((await eliminarProducto(5).catch((e) => e)).status).toBe(404);
  });
});
