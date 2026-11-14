// Test: Integración de órdenes en el panel Admin contra la API: carga, métrica Ventas sin canceladas, avance de estado, confirmación al cancelar/eliminar y manejo de errores con errorAdmin
// Función: Admin() (Dashboard y pestaña Órdenes)

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import Admin from '../pages/Admin.jsx';
import { MENSAJE_OPERACION_SIN_CONFIRMAR } from '../utils/errorAdmin.js';
import { renderConAuth } from './helpers/renderConAuth.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, USUARIO_ADMIN } from './helpers/fetchMock.js';
import { dtoOrden, dtoProducto } from './helpers/fixtures.js';

let ordenes;
let falla; // { patch, delete, getOrdenes }
let falso;

const instalarBackend = () => {
  falso = instalarFetch((l) => {
    if (l.ruta === '/api/v1/productos' && l.metodo === 'GET') {
      return respuestaJson(200, [dtoProducto(1)]);
    }
    if (l.ruta === '/api/v1/ordenes' && l.metodo === 'GET') {
      if (falla.getOrdenes) return falla.getOrdenes(l);
      return respuestaJson(200, ordenes);
    }
    const mEstado = /^\/api\/v1\/ordenes\/(\d+)\/estado$/.exec(l.ruta);
    if (mEstado && l.metodo === 'PATCH') {
      if (falla.patch) return falla.patch(l);
      const id = Number(mEstado[1]);
      ordenes = ordenes.map((o) => (o.id === id ? { ...o, estado: l.cuerpo.estado } : o));
      return respuestaJson(200, ordenes.find((o) => o.id === id));
    }
    const mOrden = /^\/api\/v1\/ordenes\/(\d+)$/.exec(l.ruta);
    if (mOrden && l.metodo === 'DELETE') {
      if (falla.delete) return falla.delete(l);
      const id = Number(mOrden[1]);
      ordenes = ordenes.filter((o) => o.id !== id);
      return respuestaJson(204);
    }
    return errorBackend(404, 'no existe');
  });
};

const montar = () => renderConAuth(<Admin />, { usuario: USUARIO_ADMIN, rutaInicial: '/admin' });
const llamadas = (metodo, patron) => llamadasDe(falso).filter((l) => l.metodo === metodo && patron.test(l.ruta));

const irAOrdenes = async () => {
  await screen.findByRole('button', { name: /^Órdenes \(/ });
  fireEvent.click(screen.getByRole('button', { name: /^Órdenes \(/ }));
};

describe('Admin — integración de órdenes con la API', () => {
  beforeEach(() => {
    localStorage.clear();
    falla = {};
    ordenes = [
      dtoOrden({
        id: 1,
        codigo: 'ORD-000001',
        boleta: 'BOL-000001',
        estado: 'PAGADA',
        total: 25000,
        cliente: { usuarioId: 10, rut: '11111111-1', nombre: 'Ana Pérez', email: 'ana@correo.cl' }
      }),
      dtoOrden({
        id: 2,
        codigo: 'ORD-000002',
        boleta: 'BOL-000002',
        estado: 'ENTREGADA',
        total: 15000,
        cliente: { usuarioId: 11, rut: '22222222-2', nombre: 'Bruno Díaz', email: 'bruno@correo.cl' }
      }),
      dtoOrden({
        id: 3,
        codigo: 'ORD-000003',
        boleta: 'BOL-000003',
        estado: 'CANCELADA',
        total: 90000,
        cliente: { usuarioId: 12, rut: '33333333-3', nombre: 'Carla Soto', email: 'carla@correo.cl' }
      })
    ];
    instalarBackend();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Muestra Ventas Registradas sin contar las órdenes CANCELADA', async () => {
    montar();
    await screen.findByRole('button', { name: 'Órdenes (3)' });
    expect(screen.getByTestId('kpi-ventas').textContent).toBe('$40.000');
    expect(screen.getByText('2 órdenes vigentes')).toBeTruthy();
  });

  test('Si falla GET /ordenes muestra ErrorCarga en la pestaña Órdenes y permite reintentar', async () => {
    falla.getOrdenes = () => errorBackend(500, 'Error de servidor');
    montar();
    await irAOrdenes();
    expect(await screen.findByText('No pudimos cargar las órdenes')).toBeTruthy();

    falla.getOrdenes = null;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('ORD-000001')).toBeTruthy();
  });

  test('Avanza el estado sin modal de confirmación (PAGADA → EN_PREPARACION) y recarga la lista', async () => {
    montar();
    await irAOrdenes();
    const fila = (await screen.findByText('ORD-000001')).closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: 'Preparar' }));

    await waitFor(() => expect(llamadas('PATCH', /\/api\/v1\/ordenes\/1\/estado/)).toHaveLength(1));
    expect(llamadas('PATCH', /\/api\/v1\/ordenes\/1\/estado/)[0].cuerpo).toEqual({ estado: 'EN_PREPARACION' });
    await waitFor(() => expect(within(screen.getByText('ORD-000001').closest('tr')).getByText(/En preparación/)).toBeTruthy());
  });

  test('Cancelar pide confirmación con ModalConfirmacion, envía PATCH al confirmar y descuenta de Ventas', async () => {
    montar();
    await irAOrdenes();
    const fila = (await screen.findByText('ORD-000001')).closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: 'Cancelar' }));

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText('¿Cancelar orden?')).toBeTruthy();
    expect(llamadas('PATCH', /\/estado/)).toHaveLength(0);

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar cancelación' }));
    await waitFor(() => expect(llamadas('PATCH', /\/api\/v1\/ordenes\/1\/estado/)).toHaveLength(1));
    expect(llamadas('PATCH', /\/api\/v1\/ordenes\/1\/estado/)[0].cuerpo).toEqual({ estado: 'CANCELADA' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(screen.getByTestId('kpi-ventas').textContent).toBe('$15.000');
    expect(screen.getByText('1 orden vigente')).toBeTruthy();
  });

  test('Eliminar pide confirmación con ModalConfirmacion y envía DELETE al confirmar', async () => {
    montar();
    await irAOrdenes();
    const fila = (await screen.findByText('ORD-000002')).closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: 'Eliminar' }));

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText('¿Eliminar orden?')).toBeTruthy();
    expect(llamadas('DELETE', /\/ordenes\//)).toHaveLength(0);

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(llamadas('DELETE', /\/api\/v1\/ordenes\/2/)).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(screen.queryByText('ORD-000002')).toBeNull());
  });

  test('Errores al cancelar/eliminar se muestran dentro del ModalConfirmacion con errorAdmin y refrescan sin reintentar', async () => {
    falla.delete = () => errorBackend(500, 'Falla inesperada');
    montar();
    await irAOrdenes();
    const fila = (await screen.findByText('ORD-000002')).closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: 'Eliminar' }));

    const dialogo = screen.getByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));

    expect(await within(dialogo).findByRole('alert')).toBeTruthy();
    expect(within(dialogo).getByRole('alert').textContent).toBe(MENSAJE_OPERACION_SIN_CONFIRMAR);
    expect(llamadas('DELETE', /\/api\/v1\/ordenes\/2/)).toHaveLength(1);
    await waitFor(() => expect(llamadas('GET', /^\/api\/v1\/ordenes$/)).toHaveLength(2));
  });

  test('Error 409 al avanzar estado se muestra con errorAdmin y refresca la lista sin reintentar', async () => {
    falla.patch = () => errorBackend(409, 'Transición no permitida');
    montar();
    await irAOrdenes();
    const fila = (await screen.findByText('ORD-000001')).closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: 'Preparar' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('Transición no permitida');
    expect(llamadas('PATCH', /\/api\/v1\/ordenes\/1\/estado/)).toHaveLength(1);
    await waitFor(() => expect(llamadas('GET', /^\/api\/v1\/ordenes$/)).toHaveLength(2));
  });

  test('Ver Boleta muestra los datos completos de la orden del backend', async () => {
    montar();
    await irAOrdenes();
    const fila = (await screen.findByText('ORD-000001')).closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: 'Ver Boleta' }));

    expect(screen.getByText('Boleta Electrónica BOL-000001')).toBeTruthy();
    expect(screen.getByText('11111111-1')).toBeTruthy();
    expect(screen.getByText('Producto 3')).toBeTruthy();
  });
});
