// Test: Panel Admin: carga productos y órdenes desde la API (con estado de carga, error y Reintentar) y ya no muestra el aviso de órdenes locales
// Función: Admin()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent } from '@testing-library/react';
import Admin from '../pages/Admin.jsx';
import { renderConAuth } from './helpers/renderConAuth.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, USUARIO_ADMIN } from './helpers/fetchMock.js';
import { dtoProducto, dtoOrden } from './helpers/fixtures.js';

const montar = () => renderConAuth(<Admin />, { usuario: USUARIO_ADMIN, rutaInicial: '/admin' });

describe('Panel Admin — datos desde la API', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Muestra "cargando", pide GET /productos y GET /ordenes una vez y refleja los totales en las pestañas y el dashboard', async () => {
    const falso = instalarFetch((l) => {
      if (l.ruta === '/api/v1/productos') {
        return respuestaJson(200, [dtoProducto(1), dtoProducto(2, { stock: 0, estado: 'AGOTADO' })]);
      }
      if (l.ruta === '/api/v1/ordenes') {
        return respuestaJson(200, [dtoOrden({ id: 1, total: 13990 })]);
      }
      return errorBackend(404, 'no existe');
    });
    montar();
    expect(screen.getByText('Cargando productos…')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Productos (2)' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Órdenes (1)' })).toBeTruthy();
    expect(screen.getByTestId('kpi-productos').textContent).toBe('2');
    expect(llamadasDe(falso).map((l) => `${l.metodo} ${l.ruta}`)).toEqual(['GET /api/v1/productos', 'GET /api/v1/ordenes']);
  });

  test('Si la API falla muestra el error con Reintentar y al reintentar carga los productos', async () => {
    let falla = true;
    const falso = instalarFetch((l) => {
      if (l.ruta === '/api/v1/productos') {
        return falla ? errorBackend(500, 'Error interno del servidor') : respuestaJson(200, [dtoProducto(1)]);
      }
      return respuestaJson(200, []);
    });
    montar();
    expect(await screen.findByText('No pudimos cargar los productos')).toBeTruthy();
    falla = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('button', { name: 'Productos (1)' })).toBeTruthy();
    const llamadasProductos = llamadasDe(falso).filter((l) => l.ruta === '/api/v1/productos');
    expect(llamadasProductos).toHaveLength(2);
  });

  test('Ya no muestra el aviso de órdenes locales de demostración', async () => {
    instalarFetch(() => respuestaJson(200, []));
    montar();
    await screen.findByRole('button', { name: 'Productos (0)' });
    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.queryByText(/Órdenes locales/i)).toBeNull();
  });
});
