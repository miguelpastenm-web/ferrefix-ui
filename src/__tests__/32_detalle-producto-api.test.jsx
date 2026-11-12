// Test: Detalle de producto desde la API: carga por id numérico, muestra ficha y precio, trata 404 e ids inválidos como no encontrado, bloquea los agotados y agrega al carrito con su id
// Función: DetalleProducto()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DetalleProducto from '../pages/DetalleProducto.jsx';
import { API_URL } from '../api/config.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend } from './helpers/fetchMock.js';
import { dtoProducto, leerCarritoGuardado } from './helpers/fixtures.js';

const montar = (id) =>
  render(
    <MemoryRouter initialEntries={[`/producto/${id}`]}>
      <Routes>
        <Route path="/producto/:id" element={<DetalleProducto />} />
      </Routes>
    </MemoryRouter>
  );

describe('Detalle de producto conectado a la API', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Pide /productos/{id}, muestra nombre, SKU, precio final, imagen desde la API y la ficha técnica', async () => {
    const falso = instalarFetch(() => respuestaJson(200, dtoProducto(7, { nombre: 'Taladro Percutor', precioVenta: 129990, especificaciones: { Potencia: '800 W', Voltaje: '20V' } })));
    montar(7);
    expect(screen.getByText('Cargando producto…')).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Taladro Percutor', level: 1 })).toBeTruthy();
    expect(llamadasDe(falso)[0].ruta).toBe('/api/v1/productos/7');
    expect(screen.getByText(/\$129\.990/)).toBeTruthy();
    expect(screen.getByText(/#5422223207/)).toBeTruthy();
    expect(screen.getByAltText('Taladro Percutor').getAttribute('src')).toBe(`${API_URL}/media/productos/p7.webp`);
    expect(screen.getByText('Potencia')).toBeTruthy();
    expect(screen.getByText('20V')).toBeTruthy();
  });

  test('Un 404 muestra "Producto no encontrado"', async () => {
    instalarFetch(() => errorBackend(404, 'Producto no encontrado: 99'));
    montar(99);
    expect(await screen.findByText('Producto no encontrado')).toBeTruthy();
  });

  test('Un id que no es número (p. ej. un SKU antiguo con letras o la ruta /producto/abc) es "no encontrado" y ni siquiera se consulta', async () => {
    const falso = instalarFetch(() => respuestaJson(200, dtoProducto(1)));
    montar('abc');
    expect(await screen.findByText('Producto no encontrado')).toBeTruthy();
    expect(falso).not.toHaveBeenCalled();
  });

  test('Un error del servidor muestra el error con Reintentar (no "no encontrado")', async () => {
    let falla = true;
    instalarFetch(() => (falla ? errorBackend(500, 'Error interno del servidor') : respuestaJson(200, dtoProducto(3, { nombre: 'Sierra' }))));
    montar(3);
    expect(await screen.findByText('No pudimos cargar el producto')).toBeTruthy();
    expect(screen.queryByText('Producto no encontrado')).toBeNull();
    falla = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Sierra', level: 1 })).toBeTruthy();
  });

  test('Agregar al carrito guarda la línea con el id numérico del backend, su SKU y la cantidad elegida', async () => {
    instalarFetch(() => respuestaJson(200, dtoProducto(7, { stock: 4, precioVenta: 20000 })));
    montar(7);
    await screen.findByRole('heading', { name: 'Producto 7', level: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Sumar una unidad' }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar al Carrito/ }));
    expect(leerCarritoGuardado()).toEqual([
      expect.objectContaining({ productoId: 7, sku: '5422223207', cantidad: 2, precioVenta: 20000, stock: 4 })
    ]);
  });

  test('Un producto AGOTADO muestra su insignia, deshabilita todo y no se puede agregar', async () => {
    instalarFetch(() => respuestaJson(200, dtoProducto(8, { estado: 'AGOTADO', stock: 0 })));
    montar(8);
    await screen.findByRole('heading', { name: 'Producto 8', level: 1 });
    expect(screen.getByText('Agotado')).toBeTruthy();
    const boton = screen.getByRole('button', { name: /Agotado Temporalmente/ });
    expect(boton.disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Sumar una unidad' }).disabled).toBe(true);
    fireEvent.click(boton);
    expect(leerCarritoGuardado()).toEqual([]);
  });

  test('Si el estado dice AGOTADO aunque el stock sea mayor que 0, igual se bloquea', async () => {
    instalarFetch(() => respuestaJson(200, dtoProducto(9, { estado: 'AGOTADO', stock: 5 })));
    montar(9);
    await screen.findByRole('heading', { name: 'Producto 9', level: 1 });
    expect(screen.getByRole('button', { name: /Agotado Temporalmente/ }).disabled).toBe(true);
  });
});
