// Test: Vista de órdenes del Admin: muestra los datos de la API, filtra por estado y búsqueda, y solo habilita las acciones válidas según el estado actual
// Función: AdminOrdenes()

import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import AdminOrdenes from '../components/AdminOrdenes.jsx';
import { dtoOrden } from './helpers/fixtures.js';

const ORDENES = [
  dtoOrden({
    id: 1,
    codigo: 'ORD-000001',
    boleta: 'BOL-000001',
    estado: 'PAGADA',
    total: 15000,
    cliente: { usuarioId: 10, rut: '11111111-1', nombre: 'Ana Pérez', email: 'ana@correo.cl' }
  }),
  dtoOrden({
    id: 2,
    codigo: 'ORD-000002',
    boleta: 'BOL-000002',
    estado: 'EN_PREPARACION',
    total: 25000,
    cliente: { usuarioId: 11, rut: '22222222-2', nombre: 'Bruno Díaz', email: 'bruno@correo.cl' }
  }),
  dtoOrden({
    id: 3,
    codigo: 'ORD-000003',
    boleta: 'BOL-000003',
    estado: 'DESPACHADA',
    total: 35000,
    cliente: { usuarioId: 12, rut: '33333333-3', nombre: 'Carla Soto', email: 'carla@correo.cl' }
  }),
  dtoOrden({
    id: 4,
    codigo: 'ORD-000004',
    boleta: 'BOL-000004',
    estado: 'ENTREGADA',
    total: 45000,
    cliente: { usuarioId: 13, rut: '44444444-4', nombre: 'Diego Mora', email: 'diego@correo.cl' }
  }),
  dtoOrden({
    id: 5,
    codigo: 'ORD-000005',
    boleta: 'BOL-000005',
    estado: 'CANCELADA',
    total: 55000,
    cliente: { usuarioId: 14, rut: '55555555-5', nombre: 'Elena Rojas', email: 'elena@correo.cl' }
  })
];

const montar = (extra = {}) => {
  const props = {
    ordenes: ORDENES,
    onVerBoleta: vi.fn(),
    onCambiarEstado: vi.fn(),
    onSolicitarCancelar: vi.fn(),
    onSolicitarEliminar: vi.fn(),
    ...extra
  };
  render(<AdminOrdenes {...props} />);
  return props;
};

const nombresBotones = (fila) => within(fila).getAllByRole('button').map((b) => b.textContent);

describe('AdminOrdenes — vista y acciones válidas por estado', () => {
  afterEach(cleanup);

  test('Muestra las órdenes de la API con código, boleta, cliente, dirección, método de pago, total y estado', () => {
    montar();
    const filas = screen.getAllByTestId('fila-orden');
    expect(filas).toHaveLength(5);
    expect(filas[0].textContent).toContain('ORD-000001');
    expect(filas[0].textContent).toContain('BOL-000001');
    expect(filas[0].textContent).toContain('Ana Pérez');
    expect(filas[0].textContent).toContain('Av. Siempre Viva 742, Santiago, Región Metropolitana');
    expect(filas[0].textContent).toContain('$15.000');
  });

  test('Muestra solo las acciones válidas según el estado actual de cada orden', () => {
    montar();
    const filas = screen.getAllByTestId('fila-orden');
    expect(nombresBotones(filas[0])).toEqual(['Ver Boleta', 'Preparar', 'Cancelar']);
    expect(nombresBotones(filas[1])).toEqual(['Ver Boleta', 'Despachar', 'Cancelar']);
    expect(nombresBotones(filas[2])).toEqual(['Ver Boleta', 'Entregar']);
    expect(nombresBotones(filas[3])).toEqual(['Ver Boleta', 'Eliminar']);
    expect(nombresBotones(filas[4])).toEqual(['Ver Boleta', 'Eliminar']);
  });

  test('Filtra por estado y por texto de búsqueda', () => {
    montar();
    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'DESPACHADA' } });
    expect(screen.getAllByTestId('fila-orden')).toHaveLength(1);
    expect(screen.getByText('ORD-000003')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'TODOS' } });
    fireEvent.change(screen.getByLabelText('Buscar órdenes'), { target: { value: 'bruno' } });
    expect(screen.getAllByTestId('fila-orden')).toHaveLength(1);
    expect(screen.getByText('ORD-000002')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Buscar órdenes'), { target: { value: 'no-existe' } });
    expect(screen.queryAllByTestId('fila-orden')).toHaveLength(0);
    expect(screen.getByText('No se encontraron órdenes con los filtros aplicados.')).toBeTruthy();
  });

  test('Cada botón llama al callback correspondiente con la orden y el estado destino', () => {
    const props = montar();
    const filas = screen.getAllByTestId('fila-orden');

    fireEvent.click(within(filas[0]).getByRole('button', { name: 'Ver Boleta' }));
    expect(props.onVerBoleta).toHaveBeenCalledWith(ORDENES[0]);

    fireEvent.click(within(filas[0]).getByRole('button', { name: 'Preparar' }));
    expect(props.onCambiarEstado).toHaveBeenCalledWith(ORDENES[0], 'EN_PREPARACION');

    fireEvent.click(within(filas[1]).getByRole('button', { name: 'Despachar' }));
    expect(props.onCambiarEstado).toHaveBeenCalledWith(ORDENES[1], 'DESPACHADA');

    fireEvent.click(within(filas[2]).getByRole('button', { name: 'Entregar' }));
    expect(props.onCambiarEstado).toHaveBeenCalledWith(ORDENES[2], 'ENTREGADA');

    fireEvent.click(within(filas[0]).getByRole('button', { name: 'Cancelar' }));
    expect(props.onSolicitarCancelar).toHaveBeenCalledWith(ORDENES[0]);

    fireEvent.click(within(filas[3]).getByRole('button', { name: 'Eliminar' }));
    expect(props.onSolicitarEliminar).toHaveBeenCalledWith(ORDENES[3]);
  });
});

