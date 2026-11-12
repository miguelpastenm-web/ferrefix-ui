// Test: Carrito en ferrefix_carrito_v2: guarda solo lo necesario, descarta y borra el carrito v1, ignora líneas dañadas y respeta el stock al cambiar cantidades
// Función: obtenerCarrito(), actualizarCantidad(), eliminarDelCarrito(), vaciarCarrito()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  agregarAlCarrito, obtenerCarrito, actualizarCantidad, eliminarDelCarrito, vaciarCarrito, EVENTO_CARRITO_ACTUALIZADO
} from '../data/carrito.js';
import { CLAVE_CARRITO } from './helpers/fixtures.js';

const P = (id, extra = {}) => ({ id, sku: `SKU${id}`, nombre: `Producto ${id}`, marca: 'M', imagen: '/i.webp', stock: 5, estado: 'DISPONIBLE', precioVenta: 1000, ...extra });

describe('Carrito — almacenamiento v2', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  test('Guarda en ferrefix_carrito_v2 las líneas {productoId, sku, nombre, marca, imagen, precioVenta, stock, cantidad}', () => {
    agregarAlCarrito(P(4), 2);
    const guardado = JSON.parse(localStorage.getItem(CLAVE_CARRITO));
    expect(guardado).toEqual([{ productoId: 4, sku: 'SKU4', nombre: 'Producto 4', marca: 'M', imagen: '/i.webp', precioVenta: 1000, stock: 5, cantidad: 2 }]);
  });

  test('El carrito v1 (ids = SKU) no se migra: se ignora y su clave se borra', () => {
    localStorage.setItem('ferrefix_carrito_v1', JSON.stringify([{ idProducto: '5422223214', cantidad: 1, precioVenta: 1 }]));
    expect(obtenerCarrito()).toEqual([]);
    expect(localStorage.getItem('ferrefix_carrito_v1')).toBeNull();
  });

  test('Líneas dañadas (sin id numérico o cantidad inválida) se ignoran; un JSON roto da carrito vacío sin lanzar', () => {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify([
      { productoId: 1, cantidad: 2 }, { productoId: 'abc', cantidad: 1 }, { productoId: 2, cantidad: 0 }, { productoId: 3, cantidad: 1.5 }, null, 'x'
    ]));
    expect(obtenerCarrito().map((l) => l.productoId)).toEqual([1]);
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(CLAVE_CARRITO, '{roto');
    expect(obtenerCarrito()).toEqual([]);
    expect(errorLog).toHaveBeenCalled();
    localStorage.setItem(CLAVE_CARRITO, '{"a":1}');
    expect(obtenerCarrito()).toEqual([]);
  });

  test('actualizarCantidad: cambia dentro del stock, rechaza pasarse, 0 elimina y un id desconocido no rompe', () => {
    agregarAlCarrito(P(1), 1);
    expect(actualizarCantidad(1, 4)).toEqual({ ok: true });
    expect(obtenerCarrito()[0].cantidad).toBe(4);
    const exceso = actualizarCantidad(1, 6);
    expect(exceso.ok).toBe(false);
    expect(exceso.error).toContain('supera el stock disponible (5');
    expect(obtenerCarrito()[0].cantidad).toBe(4);
    expect(actualizarCantidad(99, 1).ok).toBe(false);
    expect(actualizarCantidad(1, 0).ok).toBe(true);
    expect(obtenerCarrito()).toEqual([]);
  });

  test('eliminarDelCarrito y vaciarCarrito; cada cambio avisa con el evento del carrito', () => {
    const aviso = vi.fn();
    window.addEventListener(EVENTO_CARRITO_ACTUALIZADO, aviso);
    agregarAlCarrito(P(1), 1);
    agregarAlCarrito(P(2), 1);
    eliminarDelCarrito(1);
    expect(obtenerCarrito().map((l) => l.productoId)).toEqual([2]);
    vaciarCarrito();
    expect(obtenerCarrito()).toEqual([]);
    expect(aviso).toHaveBeenCalledTimes(4);
    window.removeEventListener(EVENTO_CARRITO_ACTUALIZADO, aviso);
  });

  test('Un producto con id no numérico o cantidad inválida no se agrega', () => {
    expect(agregarAlCarrito(null, 1).ok).toBe(false);
    expect(agregarAlCarrito({ ...P(1), id: 'abc' }, 1).ok).toBe(false);
    expect(agregarAlCarrito(P(1), 0).ok).toBe(false);
    expect(agregarAlCarrito(P(1), 1.5).ok).toBe(false);
    expect(obtenerCarrito()).toEqual([]);
  });
});
