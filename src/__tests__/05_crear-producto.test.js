// Test: crearProducto: guarda un producto válido en la API (subiendo antes su imagen), convierte el formulario al cuerpo del backend y muestra el 409 de SKU repetido sin crear nada
// Función: guardarProductoDesdeForm() (alta)

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { guardarProductoDesdeForm } from '../utils/guardarProducto.js';
import { formularioVacio } from '../utils/productoForm.js';
import { guardarSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend } from './helpers/fetchMock.js';
import { dtoProducto } from './helpers/fixtures.js';
import { archivoImagen } from './helpers/archivos.js';

const FORM = {
  ...formularioVacio(),
  sku: ' ABC-1 ', nombre: ' Taladro Percutor ', marca: 'Bosch', categoria: 'Herramientas', precioVenta: '129990', stock: '10', descripcion: ''
};

describe('Alta de producto (ADMIN) contra la API', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
  });
  afterEach(() => vi.unstubAllGlobals());

  test('crearProducto: inserta un producto válido en el catálogo, convierte un precio inválido en 0 y aplica imagen por defecto cuando la URL está vacía', async () => {
    // Sin imagen: se crea con imagenUrl null (la tienda muestra la imagen por defecto) y los números como números
    const falso = instalarFetch(() => respuestaJson(201, dtoProducto(20, { sku: 'ABC-1', nombre: 'Taladro Percutor', imagenUrl: null })));
    const creado = await guardarProductoDesdeForm({ modo: 'crear', form: FORM });
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('POST');
    expect(l.ruta).toBe('/api/v1/productos');
    expect(l.cuerpo).toEqual({
      sku: 'ABC-1', nombre: 'Taladro Percutor', marca: 'Bosch', categoria: 'Herramientas',
      precioVenta: 129990, stock: 10, descripcion: null, imagenUrl: null, imagenOfertaUrl: null, especificaciones: {}
    });
    expect(creado.id).toBe(20);
    expect(creado.imagen).toBe('/banner-web.webp');
  });

  test('Con imagen: primero sube el archivo (destino productos) y luego crea el producto con la ruta relativa que devolvió el servidor', async () => {
    const falso = instalarFetch((l) =>
      l.ruta === '/api/v1/imagenes'
        ? respuestaJson(201, { url: '/media/productos/abc.png', destino: 'productos', tipo: 'image/png', tamano: 100 })
        : respuestaJson(201, dtoProducto(21))
    );
    await guardarProductoDesdeForm({ modo: 'crear', form: FORM, archivoImagen: archivoImagen() });
    const llamadas = llamadasDe(falso);
    expect(llamadas.map((x) => x.ruta)).toEqual(['/api/v1/imagenes', '/api/v1/productos']);
    expect(llamadas[0].init.body.get('destino')).toBe('productos');
    expect(llamadas[1].cuerpo.imagenUrl).toBe('/media/productos/abc.png');
  });

  test('Con imagen de oferta: la sube con destino "ofertas" y la guarda en imagenOfertaUrl', async () => {
    const falso = instalarFetch((l) =>
      l.ruta === '/api/v1/imagenes' ? respuestaJson(201, { url: '/media/ofertas/o.webp', destino: 'ofertas', tipo: 'image/webp', tamano: 5 }) : respuestaJson(201, dtoProducto(22))
    );
    await guardarProductoDesdeForm({ modo: 'crear', form: FORM, archivoOferta: archivoImagen('o.webp', 'image/webp') });
    const llamadas = llamadasDe(falso);
    expect(llamadas[0].init.body.get('destino')).toBe('ofertas');
    expect(llamadas[1].cuerpo.imagenOfertaUrl).toBe('/media/ofertas/o.webp');
    expect(llamadas[1].cuerpo.imagenUrl).toBeNull();
  });

  test('SKU repetido: el 409 llega como error y no se hace nada más; si falla la subida de la imagen no se crea el producto', async () => {
    const falso = instalarFetch(() => errorBackend(409, 'Ya existe un producto con el SKU ABC-1'));
    const error = await guardarProductoDesdeForm({ modo: 'crear', form: FORM }).catch((e) => e);
    expect(error.status).toBe(409);
    expect(llamadasDe(falso)).toHaveLength(1);

    const falso2 = instalarFetch(() => errorBackend(413, 'El archivo supera el tamaño máximo permitido (6 MB)'));
    const errorSubida = await guardarProductoDesdeForm({ modo: 'crear', form: FORM, archivoImagen: archivoImagen() }).catch((e) => e);
    expect(errorSubida.status).toBe(413);
    expect(llamadasDe(falso2).map((x) => x.ruta)).toEqual(['/api/v1/imagenes']);
  });
});
