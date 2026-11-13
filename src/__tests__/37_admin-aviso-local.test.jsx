// Test: Panel Admin: carga los productos desde la API (con estado de carga, error y Reintentar) y avisa de que las órdenes siguen locales hasta E8
// Función: Admin()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent } from '@testing-library/react';
import Admin from '../pages/Admin.jsx';
import { renderConAuth } from './helpers/renderConAuth.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, USUARIO_ADMIN } from './helpers/fetchMock.js';
import { dtoProducto } from './helpers/fixtures.js';

const montar = () => renderConAuth(<Admin />, { usuario: USUARIO_ADMIN, rutaInicial: '/admin' });

describe('Panel Admin — datos desde la API', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Muestra "cargando", pide GET /productos una vez y refleja el total en la pestaña y el dashboard', async () => {
    const falso = instalarFetch(() => respuestaJson(200, [dtoProducto(1), dtoProducto(2, { stock: 0, estado: 'AGOTADO' })]));
    montar();
    expect(screen.getByText('Cargando productos…')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Productos (2)' })).toBeTruthy();
    expect(screen.getByTestId('kpi-productos').textContent).toBe('2');
    expect(llamadasDe(falso).map((l) => `${l.metodo} ${l.ruta}`)).toEqual(['GET /api/v1/productos']);
  });

  test('Si la API falla muestra el error con Reintentar y al reintentar carga los productos', async () => {
    let falla = true;
    const falso = instalarFetch(() => (falla ? errorBackend(500, 'Error interno del servidor') : respuestaJson(200, [dtoProducto(1)])));
    montar();
    expect(await screen.findByText('No pudimos cargar los productos')).toBeTruthy();
    falla = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('button', { name: 'Productos (1)' })).toBeTruthy();
    expect(falso).toHaveBeenCalledTimes(2);
  });

  test('Avisa de que las órdenes de este panel siguen siendo locales (se conectan en E8)', async () => {
    instalarFetch(() => respuestaJson(200, []));
    montar();
    const aviso = await screen.findByRole('note');
    expect(aviso.textContent).toMatch(/Órdenes locales de demostración/);
    expect(aviso.textContent).toMatch(/E8/);
  });
});
