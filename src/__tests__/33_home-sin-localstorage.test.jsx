// Test: Inicio: no lee localStorage al importarse y arma las ofertas de Seguridad y Maderas con los productos reales que traen imagen de oferta (la sección se oculta si no hay ninguno)
// Función: Home(), ofertasDeCategoria()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../pages/Home.jsx';
import { ofertasDeCategoria } from '../utils/ofertas.js';
import { adaptarProducto } from '../api/productos.js';
import { API_URL } from '../api/config.js';
import { instalarFetch, respuestaJson, errorBackend } from './helpers/fetchMock.js';
import { dtoProducto } from './helpers/fixtures.js';

// Como el backend real: los ids no siguen el orden de los SKU
const CATALOGO = [
  dtoProducto(18, { sku: '5422223231', nombre: 'Casco', categoria: 'Seguridad', imagenOfertaUrl: '/media/ofertas/casco.webp' }),
  dtoProducto(15, { sku: '5422223228', nombre: 'Guantes', categoria: 'Seguridad', imagenOfertaUrl: '/media/ofertas/guantes.webp' }),
  dtoProducto(16, { sku: '5422223229', nombre: 'Lentes', categoria: 'Seguridad', imagenOfertaUrl: '/media/ofertas/lentes.webp' }),
  dtoProducto(17, { sku: '5422223230', nombre: 'Chaleco', categoria: 'Seguridad' }), // sin imagen de oferta
  dtoProducto(11, { sku: '5422223224', nombre: 'Melamina', categoria: 'Maderas', imagenOfertaUrl: '/media/ofertas/melamina.webp' }),
  dtoProducto(1, { nombre: 'Taladro', categoria: 'Herramientas' })
];

const montar = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );

describe('Inicio', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('Importar la página de inicio NO lee localStorage', async () => {
    vi.resetModules();
    const lectura = vi.spyOn(Storage.prototype, 'getItem');
    await import('../pages/Home.jsx');
    expect(lectura).not.toHaveBeenCalled();
  });

  test('ofertasDeCategoria: solo la categoría pedida y solo con imagen de oferta, ordenadas por SKU, con enlace por id', () => {
    const productos = CATALOGO.map(adaptarProducto);
    const seguridad = ofertasDeCategoria(productos, 'Seguridad');
    expect(seguridad.map((o) => o.alt)).toEqual(['Guantes', 'Lentes', 'Casco']);
    expect(seguridad.map((o) => o.link)).toEqual(['/producto/15', '/producto/16', '/producto/18']);
    expect(seguridad[0].img).toBe(`${API_URL}/media/ofertas/guantes.webp`);
    expect(ofertasDeCategoria(productos, 'Herramientas')).toEqual([]);
    expect(ofertasDeCategoria(null, 'Seguridad')).toEqual([]);
    expect(ofertasDeCategoria(undefined, 'Seguridad')).toEqual([]);
  });

  test('Muestra las ofertas que existen en el backend (3 de Seguridad y 1 de Maderas), no más', async () => {
    instalarFetch(() => respuestaJson(200, CATALOGO));
    const { container } = montar();
    expect(await screen.findByAltText('Guantes')).toBeTruthy();
    expect(screen.getByAltText('Guantes').closest('a').getAttribute('href')).toBe('/producto/15');
    expect(screen.getByAltText('Casco').closest('a').getAttribute('href')).toBe('/producto/18');
    expect(screen.getByAltText('Melamina').closest('a').getAttribute('href')).toBe('/producto/11');
    expect(screen.queryByAltText('Chaleco')).toBeNull(); // sin imagenOfertaUrl
    expect(screen.queryByAltText('Taladro')).toBeNull();
    expect(container.querySelectorAll('.oferta-destacada')).toHaveLength(2);
  });

  test('Si ningún producto tiene imagen de oferta las secciones de ofertas se ocultan', async () => {
    const falso = instalarFetch(() => respuestaJson(200, [dtoProducto(1), dtoProducto(2)]));
    const { container } = montar();
    await waitFor(() => expect(falso).toHaveBeenCalled());
    await act(async () => {});
    expect(container.querySelectorAll('.oferta-destacada')).toHaveLength(0);
    expect(screen.getByText('Categorías destacadas')).toBeTruthy();
  });

  test('Si la API falla el inicio igual se muestra, sin ofertas y sin romperse', async () => {
    const falso = instalarFetch(() => errorBackend(500, 'Error interno del servidor'));
    const { container } = montar();
    await waitFor(() => expect(falso).toHaveBeenCalled());
    await act(async () => {});
    expect(container.querySelectorAll('.oferta-destacada')).toHaveLength(0);
    expect(screen.getByText('Categorías destacadas')).toBeTruthy();
  });
});
