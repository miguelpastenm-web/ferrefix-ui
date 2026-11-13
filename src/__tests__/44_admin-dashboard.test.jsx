// Test: Dashboard del Admin: muestra las 4 métricas (productos, stock crítico con agotados aparte, valor de inventario y ventas) y la lista de reposición con su acción de editar stock
// Función: AdminDashboard()

import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import AdminDashboard from '../components/AdminDashboard.jsx';
import { adaptarProducto } from '../api/productos.js';
import { calcularMetricasProductos, requiereReposicion } from '../utils/metricasAdmin.js';
import { dtoProducto } from './helpers/fixtures.js';

const PRODUCTOS = [
  dtoProducto(1, { nombre: 'Normal', stock: 40, precioVenta: 1000 }),
  dtoProducto(2, { nombre: 'Crítico', stock: 3, precioVenta: 2000 }),
  dtoProducto(3, { nombre: 'Agotado', stock: 0, estado: 'AGOTADO', precioVenta: 3000 })
].map(adaptarProducto);
const VENTAS = { titulo: 'Ventas (total cobrado, sin canceladas)', valor: '$150.000', subtitulo: '4 órdenes' };

const montar = (extra = {}) => {
  const props = {
    metricas: calcularMetricasProductos(PRODUCTOS),
    ventas: VENTAS,
    productosReposicion: PRODUCTOS.filter(requiereReposicion),
    onIrAInventario: vi.fn(),
    onEditarStock: vi.fn(),
    ...extra
  };
  render(<AdminDashboard {...props} />);
  return props;
};

describe('AdminDashboard', () => {
  afterEach(() => cleanup());

  test('muestra productos, stock crítico (1 a 5) con los agotados aparte, valor del inventario y ventas', () => {
    montar();
    expect(screen.getByTestId('kpi-productos').textContent).toBe('3');
    expect(screen.getByText('Stock Crítico (1 a 5 unids)')).toBeTruthy();
    expect(screen.getByTestId('kpi-critico').textContent).toBe('1');
    expect(screen.getByTestId('kpi-agotados').textContent).toBe('1 agotado');
    expect(screen.getByTestId('kpi-inventario').textContent).toContain('46.000'); // 40×1000 + 3×2000
    expect(screen.getByText('Ventas (total cobrado, sin canceladas)')).toBeTruthy();
    expect(screen.getByTestId('kpi-ventas').textContent).toBe('$150.000');
    expect(screen.getByText('4 órdenes')).toBeTruthy();
  });

  test('lista de reposición: críticos y agotados (con insignia Agotado), no los de stock normal', () => {
    montar();
    const filas = screen.getAllByTestId('fila-reposicion');
    expect(filas).toHaveLength(2);
    expect(within(filas[0]).getByText('Crítico')).toBeTruthy();
    expect(within(filas[0]).getByText('3 unids (Bajo)')).toBeTruthy();
    expect(within(filas[1]).getByText('Agotado', { selector: 'span.admin-badge-dark' })).toBeTruthy();
    expect(screen.queryByText('Normal')).toBeNull();
  });

  test('Editar Stock llama al callback con el producto; "Ir a Inventario Completo" también avisa', () => {
    const props = montar();
    fireEvent.click(within(screen.getAllByTestId('fila-reposicion')[0]).getByRole('button', { name: 'Editar Stock' }));
    expect(props.onEditarStock).toHaveBeenCalledWith(expect.objectContaining({ id: 2, nombre: 'Crítico' }));
    fireEvent.click(screen.getByRole('button', { name: /Ir a Inventario Completo/ }));
    expect(props.onIrAInventario).toHaveBeenCalledTimes(1);
  });

  test('sin productos por reponer muestra el mensaje de niveles óptimos; el singular/plural de agotados', () => {
    montar({ metricas: { totalProductos: 1, stockCritico: 0, agotados: 2, valorInventario: 0 }, productosReposicion: [] });
    expect(screen.getByText(/superior a 5 unidades/)).toBeTruthy();
    expect(screen.getByTestId('kpi-agotados').textContent).toBe('2 agotados');
  });
});
