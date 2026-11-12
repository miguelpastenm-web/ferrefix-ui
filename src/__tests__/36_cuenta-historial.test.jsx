// Test: Mis compras (historial): lista las órdenes del cliente desde la API en el orden del servidor, con insignia por cada estado, detalle expandible con datos del servidor, y maneja vacío, error y estados desconocidos
// Función: CuentaCliente() (pestaña Mis compras), HistorialCompras()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import CuentaCliente from '../pages/CuentaCliente.jsx';
import { renderConAuth } from './helpers/renderConAuth.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, USUARIO_CLIENTE } from './helpers/fetchMock.js';
import { dtoOrden } from './helpers/fixtures.js';

const ESTADOS = ['PAGADA', 'EN_PREPARACION', 'DESPACHADA', 'ENTREGADA', 'CANCELADA'];
// El servidor entrega de la más reciente a la más antigua: ORD-000009 primero
const ORDENES = ESTADOS.map((estado, i) =>
  dtoOrden({
    id: 9 - i, codigo: `ORD-00000${9 - i}`, boleta: `BOL-00000${9 - i}`, estado,
    createdAt: `2026-11-${String(12 - i).padStart(2, '0')}T10:30:15`
  })
);

const montar = () => renderConAuth(<CuentaCliente />, { usuario: USUARIO_CLIENTE, rutaInicial: '/cuenta?tab=compras' });
const tarjetas = () => screen.getAllByTestId('orden-historial');

describe('Mis compras — historial desde la API', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('La pestaña se llama "Mis compras" y pide GET /ordenes/mis-ordenes (solo al abrirla)', async () => {
    const falso = instalarFetch(() => respuestaJson(200, ORDENES));
    montar();
    expect(screen.getByRole('button', { name: /Mis compras/ })).toBeTruthy();
    expect(screen.getByText('Cargando tus compras…')).toBeTruthy();
    await screen.findByText('Total Compras: 5');
    expect(llamadasDe(falso).map((l) => `${l.metodo} ${l.ruta}`)).toEqual(['GET /api/v1/ordenes/mis-ordenes']);
  });

  test('Muestra cada orden en el orden del servidor, con código, boleta y fecha como texto', async () => {
    instalarFetch(() => respuestaJson(200, ORDENES));
    montar();
    await screen.findByText('Total Compras: 5');
    expect(tarjetas().map((t) => /ORD-\d+/.exec(t.textContent)[0])).toEqual(['ORD-000009', 'ORD-000008', 'ORD-000007', 'ORD-000006', 'ORD-000005']);
    expect(within(tarjetas()[0]).getByText('Boleta: BOL-000009')).toBeTruthy();
    expect(within(tarjetas()[0]).getByText('12-11-2026 10:30')).toBeTruthy();
    expect(within(tarjetas()[4]).getByText('08-11-2026 10:30')).toBeTruthy();
  });

  test('Cada estado del backend tiene su insignia con su texto', async () => {
    instalarFetch(() => respuestaJson(200, ORDENES));
    montar();
    await screen.findByText('Total Compras: 5');
    const insignias = tarjetas().map((t) => {
      const b = t.querySelector('[data-estado]');
      return [b.getAttribute('data-estado'), b.textContent];
    });
    expect(insignias).toEqual([
      ['PAGADA', '● Pagada'],
      ['EN_PREPARACION', '● En preparación'],
      ['DESPACHADA', '● Despachada'],
      ['ENTREGADA', '● Entregada'],
      ['CANCELADA', '● Cancelada']
    ]);
  });

  test('El detalle se expande con los datos que ya trae la lista (sin otra llamada) y muestra envío y total del servidor', async () => {
    const falso = instalarFetch(() => respuestaJson(200, [dtoOrden({ costoEnvio: 0, subtotal: 10000, total: 10000 })]));
    montar();
    await screen.findByText('Total Compras: 1');
    expect(screen.queryByText('Producto 3')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }));
    expect(screen.getByText('Producto 3')).toBeTruthy();
    const tarjeta = tarjetas()[0];
    expect(within(tarjeta).getByText(/Envío:/).parentElement.textContent).toContain('Gratis');
    expect(within(tarjeta).getByText(/Av\. Siempre Viva 742, Santiago, Región Metropolitana/)).toBeTruthy();
    expect(within(tarjeta).getAllByText('$10.000').length).toBeGreaterThan(0);
    expect(falso).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar detalle' }));
    expect(screen.queryByText('Producto 3')).toBeNull();
  });

  test('Sin compras muestra el mensaje de vacío', async () => {
    instalarFetch(() => respuestaJson(200, []));
    montar();
    expect(await screen.findByText('Aún no registras compras con tu cuenta')).toBeTruthy();
    expect(screen.getByText('Total Compras: 0')).toBeTruthy();
  });

  test('Un estado que el front no conoce se muestra tal cual y no rompe la lista', async () => {
    instalarFetch(() => respuestaJson(200, [dtoOrden({ estado: 'REEMBOLSADA' })]));
    montar();
    await screen.findByText('Total Compras: 1');
    expect(tarjetas()[0].querySelector('[data-estado]').textContent).toBe('● REEMBOLSADA');
  });

  test('Si la API falla muestra el error con Reintentar y al reintentar carga las compras', async () => {
    let falla = true;
    const falso = instalarFetch(() => (falla ? errorBackend(500, 'Error interno del servidor') : respuestaJson(200, ORDENES)));
    montar();
    expect(await screen.findByText('No pudimos cargar tus compras')).toBeTruthy();
    expect(screen.queryByText(/Total Compras/)).toBeNull();
    falla = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Total Compras: 5');
    expect(falso).toHaveBeenCalledTimes(2);
  });

  test('La pestaña "Mis datos" NO consulta las órdenes', async () => {
    const falso = instalarFetch(() => respuestaJson(200, ORDENES));
    renderConAuth(<CuentaCliente />, { usuario: USUARIO_CLIENTE, rutaInicial: '/cuenta?tab=datos' });
    await waitFor(() => expect(screen.getByText('Ficha de Despacho del Cliente')).toBeTruthy());
    expect(falso).not.toHaveBeenCalled();
  });
});
