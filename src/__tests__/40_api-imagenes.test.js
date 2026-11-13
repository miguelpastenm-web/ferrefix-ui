// Test: Subida de imágenes: prechequea tipo y tamaño, envía el archivo tal cual por multipart (archivo + destino) y traduce los errores 400, 413 y 403 del backend
// Función: validarArchivoImagen(), subirImagen()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { validarArchivoImagen, subirImagen, TAMANO_MAXIMO_IMAGEN_BYTES, DESTINOS_IMAGEN } from '../api/imagenes.js';
import { guardarSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { ApiError } from '../api/errores.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend } from './helpers/fetchMock.js';
import { archivoImagen, MB } from './helpers/archivos.js';

const RESPUESTA = { url: '/media/productos/uuid.png', destino: 'productos', tipo: 'image/png', tamano: 100 };

describe('validarArchivoImagen (prechequeo)', () => {
  test.each([
    ['foto.jpg', 'image/jpeg'], ['foto.png', 'image/png'], ['foto.webp', 'image/webp'], ['foto.avif', 'image/avif']
  ])('acepta %s', (nombre, tipo) => {
    expect(validarArchivoImagen(archivoImagen(nombre, tipo))).toBe('');
  });

  test('acepta el tamaño máximo exacto (6 MB) y rechaza un byte más', () => {
    expect(TAMANO_MAXIMO_IMAGEN_BYTES).toBe(6 * MB);
    expect(validarArchivoImagen(archivoImagen('a.png', 'image/png', 6 * MB))).toBe('');
    expect(validarArchivoImagen(archivoImagen('a.png', 'image/png', 6 * MB + 1))).toBe('La imagen supera el tamaño máximo permitido (6 MB).');
  });

  test('rechaza formatos no permitidos (GIF, PDF, BMP), archivos vacíos y la ausencia de archivo', () => {
    expect(validarArchivoImagen(archivoImagen('a.gif', 'image/gif'))).toMatch(/Formato no permitido/);
    expect(validarArchivoImagen(archivoImagen('a.pdf', 'application/pdf'))).toMatch(/Formato no permitido/);
    expect(validarArchivoImagen(archivoImagen('a.bmp', 'image/bmp'))).toMatch(/Formato no permitido/);
    expect(validarArchivoImagen(archivoImagen('a.png', 'image/png', 0))).toBe('El archivo está vacío.');
    expect(validarArchivoImagen(null)).toBe('Selecciona un archivo de imagen.');
  });

  test('si el navegador no informa el tipo, decide por la extensión', () => {
    expect(validarArchivoImagen(archivoImagen('foto.JPG', ''))).toBe('');
    expect(validarArchivoImagen(archivoImagen('foto.txt', ''))).toMatch(/Formato no permitido/);
  });
});

describe('subirImagen', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
  });
  afterEach(() => vi.unstubAllGlobals());

  test('POST /imagenes con Bearer: multipart con las partes "archivo" (el mismo archivo) y "destino", sin Content-Type manual', async () => {
    const falso = instalarFetch(() => respuestaJson(201, RESPUESTA));
    const archivo = archivoImagen('foto.png', 'image/png', 50);
    const resultado = await subirImagen(archivo, 'productos');
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('POST');
    expect(l.ruta).toBe('/api/v1/imagenes');
    expect(l.authorization).toBe('Bearer tok');
    expect(l.cabeceras['Content-Type']).toBeUndefined(); // lo pone el navegador con el boundary
    expect(l.init.body).toBeInstanceOf(FormData);
    expect(l.init.body.get('destino')).toBe('productos');
    expect(l.init.body.get('archivo')).toBeInstanceOf(File);
    expect(l.init.body.get('archivo').name).toBe('foto.png');
    expect(l.init.body.get('archivo').size).toBe(50);
    expect(resultado).toEqual(RESPUESTA); // url relativa, tal cual
  });

  test('Un Blob generado (sin nombre) se envía con el nombre indicado', async () => {
    const falso = instalarFetch(() => respuestaJson(201, { ...RESPUESTA, destino: 'ofertas' }));
    await subirImagen(new Blob([new Uint8Array(10)], { type: 'image/webp' }), 'ofertas', 'oferta-1.webp');
    const [l] = llamadasDe(falso);
    expect(l.init.body.get('archivo').name).toBe('oferta-1.webp');
    expect(l.init.body.get('destino')).toBe('ofertas');
  });

  test('Los 4 destinos del backend están permitidos y uno inventado se rechaza sin llamar a la API', async () => {
    expect(DESTINOS_IMAGEN).toEqual(['productos', 'ofertas', 'banners', 'maquinas']);
    const falso = instalarFetch(() => respuestaJson(201, RESPUESTA));
    const error = await subirImagen(archivoImagen(), 'otro').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(falso).not.toHaveBeenCalled();
  });

  test('Un archivo inválido (formato o tamaño) falla antes de llamar a la API, con ApiError 400', async () => {
    const falso = instalarFetch(() => respuestaJson(201, RESPUESTA));
    const gif = await subirImagen(archivoImagen('a.gif', 'image/gif')).catch((e) => e);
    expect(gif.status).toBe(400);
    expect(gif.mensaje).toMatch(/Formato no permitido/);
    const grande = await subirImagen(archivoImagen('a.png', 'image/png', 6 * MB + 1)).catch((e) => e);
    expect(grande.mensaje).toMatch(/tamaño máximo/);
    expect(falso).not.toHaveBeenCalled();
  });

  test.each([
    [400, 'El archivo no es una imagen válida. Formatos permitidos: JPEG, PNG, WEBP y AVIF'],
    [413, 'El archivo supera el tamaño máximo permitido (6 MB)'],
    [403, 'No tienes permisos para acceder a este recurso']
  ])('el %i del backend llega como ApiError con su mensaje', async (status, mensaje) => {
    instalarFetch(() => errorBackend(status, mensaje));
    const error = await subirImagen(archivoImagen()).catch((e) => e);
    expect(error.status).toBe(status);
    expect(error.mensaje).toBe(mensaje);
  });
});
