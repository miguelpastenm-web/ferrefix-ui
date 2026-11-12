// Test: Configuración de la API: normaliza VITE_API_URL (sin espacios ni barra final, con valor por defecto solo si falta) y urlMedia antepone la URL de la API a /media/* sin tocar el resto
// Función: normalizarUrlBase(), API_URL, urlMedia()

import { describe, test, expect, afterEach, vi } from 'vitest';
import { normalizarUrlBase, API_URL, API_URL_POR_DEFECTO } from '../api/config.js';
import { urlMedia, IMAGEN_POR_DEFECTO } from '../api/media.js';

describe('API — configuración', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  test('normalizarUrlBase: recorta espacios y barras finales, y tolera valores vacíos', () => {
    expect(normalizarUrlBase('http://localhost:8080')).toBe('http://localhost:8080');
    expect(normalizarUrlBase('  http://3.141.59.26:8080/  ')).toBe('http://3.141.59.26:8080');
    expect(normalizarUrlBase('http://x:8080///')).toBe('http://x:8080');
    expect(normalizarUrlBase('')).toBe('');
    expect(normalizarUrlBase(undefined)).toBe('');
    expect(normalizarUrlBase(null)).toBe('');
  });

  test('API_URL: toma VITE_API_URL sin barra final y usa localhost:8080 solo cuando falta o está en blanco', async () => {
    expect(API_URL_POR_DEFECTO).toBe('http://localhost:8080');
    expect(API_URL).toBeTruthy();

    vi.stubEnv('VITE_API_URL', 'http://3.141.59.26:8080/');
    vi.resetModules();
    expect((await import('../api/config.js')).API_URL).toBe('http://3.141.59.26:8080');

    vi.stubEnv('VITE_API_URL', '   ');
    vi.resetModules();
    expect((await import('../api/config.js')).API_URL).toBe('http://localhost:8080');
  });
});

describe('API — urlMedia', () => {
  test('urlMedia: sin imagen devuelve la imagen por defecto del sitio', () => {
    expect(urlMedia(undefined)).toBe(IMAGEN_POR_DEFECTO);
    expect(urlMedia(null)).toBe(IMAGEN_POR_DEFECTO);
    expect(urlMedia('')).toBe(IMAGEN_POR_DEFECTO);
    expect(urlMedia('   ')).toBe(IMAGEN_POR_DEFECTO);
    expect(urlMedia(42)).toBe(IMAGEN_POR_DEFECTO);
    expect(IMAGEN_POR_DEFECTO).toBe('/banner-web.webp');
  });

  test('urlMedia: antepone la URL de la API a las rutas /media/ del backend', () => {
    expect(urlMedia('/media/productos/taladro-percutor.webp')).toBe(`${API_URL}/media/productos/taladro-percutor.webp`);
    expect(urlMedia('  /media/maquinas/maq-bet-02.webp ')).toBe(`${API_URL}/media/maquinas/maq-bet-02.webp`);
  });

  test('urlMedia: deja pasar URLs absolutas, data: y blob: y también los assets propios del front', () => {
    expect(urlMedia('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    expect(urlMedia('http://otro.host/a.png')).toBe('http://otro.host/a.png');
    expect(urlMedia('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    expect(urlMedia('blob:http://localhost/1234')).toBe('blob:http://localhost/1234');
    expect(urlMedia('/banner-web.webp')).toBe('/banner-web.webp');
    expect(urlMedia('/assets/products/x-1a2b3c.webp')).toBe('/assets/products/x-1a2b3c.webp');
  });
});
