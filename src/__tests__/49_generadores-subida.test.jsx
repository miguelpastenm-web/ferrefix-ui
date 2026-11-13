// Test: Generadores de ofertas: suben su imagen al backend (destino "ofertas") en vez del plugin de Vite, guardan la ruta relativa y el inicio la muestra con la URL de la API
// Función: guardarImagenGenerada(), Home() (ofertas generadas)

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { guardarImagenGenerada, DESTINO_OFERTAS, DESTINO_PRODUCTOS, DESTINO_BANNERS } from '../utils/imagenWebp.js';
import Home from '../pages/Home.jsx';
import { API_URL } from '../api/config.js';
import { guardarSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend } from './helpers/fetchMock.js';
import { dtoProducto } from './helpers/fixtures.js';

const WEBP = () => new Blob([new Uint8Array(20)], { type: 'image/webp' });

describe('Generadores — subida al backend', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Los destinos son los del backend (productos, ofertas, banners), no los carpetas del plugin de Vite', () => {
    expect(DESTINO_PRODUCTOS).toBe('productos');
    expect(DESTINO_OFERTAS).toBe('ofertas');
    expect(DESTINO_BANNERS).toBe('banners');
  });

  test('guardarImagenGenerada: POST /api/v1/imagenes con el archivo .webp y destino "ofertas"; devuelve la ruta relativa', async () => {
    const falso = instalarFetch(() => respuestaJson(201, { url: '/media/ofertas/uuid.webp', destino: 'ofertas', tipo: 'image/webp', tamano: 20 }));
    const url = await guardarImagenGenerada(WEBP(), 'oferta-1-Guantes Nitrilo');
    expect(url).toBe('/media/ofertas/uuid.webp');
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('POST');
    expect(l.ruta).toBe('/api/v1/imagenes');
    expect(l.authorization).toBe('Bearer tok');
    expect(l.init.body.get('destino')).toBe('ofertas');
    expect(l.init.body.get('archivo').name).toBe('oferta-1-guantes-nitrilo.webp');
    expect(llamadasDe(falso).some((x) => /\/api\/imagenes\/webp/.test(x.ruta))).toBe(false); // ya no usa el plugin
  });

  test('un PNG conserva su extensión; otro destino se respeta', async () => {
    const falso = instalarFetch(() => respuestaJson(201, { url: '/media/banners/x.png', destino: 'banners', tipo: 'image/png', tamano: 20 }));
    await guardarImagenGenerada(new Blob([new Uint8Array(20)], { type: 'image/png' }), 'banner', DESTINO_BANNERS);
    const [l] = llamadasDe(falso);
    expect(l.init.body.get('archivo').name).toBe('banner.png');
    expect(l.init.body.get('destino')).toBe('banners');
  });

  test('sin imagen lanza error; los errores del backend (413, 403) llegan tal cual para mostrarlos', async () => {
    await expect(guardarImagenGenerada(null, 'x')).rejects.toThrow('No hay una imagen para guardar.');
    instalarFetch(() => errorBackend(413, 'El archivo supera el tamaño máximo permitido (6 MB)'));
    const grande = await guardarImagenGenerada(WEBP(), 'x').catch((e) => e);
    expect(grande.status).toBe(413);
    instalarFetch(() => errorBackend(403, 'No tienes permisos para acceder a este recurso'));
    expect((await guardarImagenGenerada(WEBP(), 'x').catch((e) => e)).status).toBe(403);
  });

  test('Inicio: una oferta generada (ruta /media/...) se muestra con la URL de la API; una guardada con el plugin antiguo se deja igual', async () => {
    localStorage.setItem(
      'ferrefix_generador_ofertas_v1',
      JSON.stringify([
        { imagen: '/media/ofertas/gen.webp', enlace: '/producto/11', alt: 'Generada nueva' },
        { imagen: '/assets/sales/vieja.webp', enlace: '/producto/12', alt: 'Generada antigua' }
      ])
    );
    instalarFetch(() =>
      respuestaJson(200, [
        dtoProducto(11, { sku: '5422223224', nombre: 'Melamina', categoria: 'Maderas', imagenOfertaUrl: '/media/ofertas/melamina.webp' }),
        dtoProducto(12, { sku: '5422223225', nombre: 'OSB', categoria: 'Maderas', imagenOfertaUrl: '/media/ofertas/osb.webp' }),
        dtoProducto(13, { sku: '5422223226', nombre: 'Terciado', categoria: 'Maderas', imagenOfertaUrl: '/media/ofertas/terciado.webp' })
      ])
    );
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect((await screen.findByAltText('Generada nueva')).getAttribute('src')).toBe(`${API_URL}/media/ofertas/gen.webp`);
    expect(screen.getByAltText('Generada antigua').getAttribute('src')).toBe('/assets/sales/vieja.webp');
    expect(screen.getByAltText('Terciado').getAttribute('src')).toBe(`${API_URL}/media/ofertas/terciado.webp`); // la tercera sigue siendo la del producto
  });
});
