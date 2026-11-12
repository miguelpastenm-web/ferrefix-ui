// Test: agregarAlCarrito: agrega un producto con stock suficiente, rechaza una cantidad mayor al stock y bloquea un producto agotado
// Función: agregarAlCarrito()

import { describe, test, expect, beforeEach } from 'vitest';
import { agregarAlCarrito, obtenerCarrito, vaciarCarrito } from '../data/carrito.js';

describe('Carrito — agregarAlCarrito', () => {
  beforeEach(() => {
    localStorage.clear();
    vaciarCarrito();
  });

  test('agregarAlCarrito: agrega un producto con stock suficiente, rechaza una cantidad mayor al stock y bloquea un producto agotado', () => {
    const producto = { id: 101, sku: '5422223101', nombre: 'Esmeril', marca: 'Bosch', stock: 10, estado: 'DISPONIBLE', precioVenta: 45000 };
    const correcto = agregarAlCarrito(producto, 2);
    expect(correcto.ok).toBe(true);
    expect(correcto.cantidadTotal).toBe(2);
    expect(obtenerCarrito()).toHaveLength(1);
    expect(obtenerCarrito()[0]).toMatchObject({ productoId: 101, sku: '5422223101', cantidad: 2, precioVenta: 45000 });

    // Sumar más al mismo producto respeta el stock total
    expect(agregarAlCarrito(producto, 8).ok).toBe(true);
    const mas = agregarAlCarrito(producto, 1);
    expect(mas.ok).toBe(false);
    expect(mas.error).toContain('stock máximo disponible');

    const sinStockSuficiente = { id: 102, sku: '5422223102', nombre: 'Sierra', stock: 3, estado: 'DISPONIBLE', precioVenta: 80000 };
    const error = agregarAlCarrito(sinStockSuficiente, 5);
    expect(error.ok).toBe(false);
    expect(error.error).toContain('disponibles en stock');

    // Agotado: ni con stock 0 ni con estado AGOTADO (aunque el stock dijera otra cosa)
    const agotado = { id: 103, sku: '5422223103', nombre: 'Pintura', stock: 0, estado: 'AGOTADO', precioVenta: 15000 };
    const borde = agregarAlCarrito(agotado, 1);
    expect(borde.ok).toBe(false);
    expect(borde.error).toContain('no cuenta con stock');
    const incoherente = agregarAlCarrito({ ...agotado, id: 104, stock: 5 }, 1);
    expect(incoherente.ok).toBe(false);
    expect(obtenerCarrito().map((l) => l.productoId)).toEqual([101]);
  });
});
