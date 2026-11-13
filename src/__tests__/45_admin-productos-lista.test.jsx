// Test: Lista de productos del Admin: busca por nombre, marca o SKU, filtra por categoría y por stock crítico/agotado en el cliente, y entrega cada producto a las acciones de editar, stock y eliminar
// Función: AdminProductos()

import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import AdminProductos from '../components/AdminProductos.jsx';
import { adaptarProducto } from '../api/productos.js';
import { dtoProducto } from './helpers/fixtures.js';

const PRODUCTOS = [
  dtoProducto(1, { sku: 'TAL-001', nombre: 'Taladro Percutor', marca: 'Bosch', categoria: 'Herramientas', stock: 40, precioVenta: 90000 }),
  dtoProducto(2, { sku: 'CEM-002', nombre: 'Cemento Extra', marca: 'Melón', categoria: 'Construcción', stock: 4, precioVenta: 5000 }),
  dtoProducto(3, { sku: 'GUA-003', nombre: 'Guantes', marca: 'Nitrex', categoria: 'Seguridad', stock: 0, estado: 'AGOTADO', precioVenta: 1500 })
].map(adaptarProducto);

const montar = (extra = {}) => {
  const props = {
    productos: PRODUCTOS, soloCriticos: false, onAlternarCriticos: vi.fn(), onCrear: vi.fn(),
    onEditar: vi.fn(), onEditarStock: vi.fn(), onEliminar: vi.fn(), ...extra
  };
  render(<AdminProductos {...props} />);
  return props;
};
const nombres = () => screen.getAllByTestId('fila-producto').map((f) => within(f).getByText(/Taladro|Cemento|Guantes/).textContent);

describe('AdminProductos', () => {
  afterEach(() => cleanup());

  test('muestra SKU, precio, stock y la insignia Agotado / Bajo según corresponda', () => {
    montar();
    const filas = screen.getAllByTestId('fila-producto');
    expect(filas).toHaveLength(3);
    expect(within(filas[0]).getByText('#TAL-001')).toBeTruthy();
    expect(within(filas[0]).getByText(/\$90\.000/)).toBeTruthy();
    expect(within(filas[0]).getByText('40 unids')).toBeTruthy();
    expect(within(filas[1]).getByText('4 unids (Bajo)')).toBeTruthy();
    expect(within(filas[2]).getByText('Agotado')).toBeTruthy();
    expect(screen.getByText('Mostrando 3 de 3 productos en total')).toBeTruthy();
  });

  test('la búsqueda encuentra por nombre, marca o SKU (sin distinguir mayúsculas)', () => {
    montar();
    const buscar = screen.getByLabelText('Buscar productos');
    fireEvent.change(buscar, { target: { value: 'bosch' } });
    expect(nombres()).toEqual(['Taladro Percutor']);
    fireEvent.change(buscar, { target: { value: 'cem-002' } });
    expect(nombres()).toEqual(['Cemento Extra']);
    fireEvent.change(buscar, { target: { value: 'nada' } });
    expect(screen.getByText(/No se encontraron productos/)).toBeTruthy();
  });

  test('el filtro de categoría es del cliente: "Todas" muestra todo y una categoría deja solo las suyas', () => {
    montar();
    fireEvent.change(screen.getByLabelText('Filtrar por categoría'), { target: { value: 'Seguridad' } });
    expect(nombres()).toEqual(['Guantes']);
    fireEvent.change(screen.getByLabelText('Filtrar por categoría'), { target: { value: 'Todas' } });
    expect(nombres()).toHaveLength(3);
  });

  test('con el filtro de stock crítico muestra críticos Y agotados, no los de stock normal', () => {
    montar({ soloCriticos: true });
    expect(nombres()).toEqual(['Cemento Extra', 'Guantes']);
    expect(screen.getByRole('button', { name: /Mostrando críticos y agotados \(≤ 5\)/ }).getAttribute('aria-pressed')).toBe('true');
  });

  test('los botones entregan el producto correcto a editar, stock y eliminar; Agregar y el filtro avisan', () => {
    const props = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Editar Cemento Extra' }));
    expect(props.onEditar).toHaveBeenCalledWith(expect.objectContaining({ id: 2, sku: 'CEM-002' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar stock de Guantes' }));
    expect(props.onEditarStock).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Taladro Percutor' }));
    expect(props.onEliminar).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar Producto' }));
    expect(props.onCrear).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar stock crítico' }));
    expect(props.onAlternarCriticos).toHaveBeenCalledTimes(1);
  });
});
