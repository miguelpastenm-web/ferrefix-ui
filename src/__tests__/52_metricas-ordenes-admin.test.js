// Test: Métricas de órdenes y reglas de transición/eliminación del Admin
// Función: calcularMetricasOrdenes(), transicionesOrden(), puedeEliminarOrden()

import { describe, test, expect } from 'vitest';
import { calcularMetricasOrdenes } from '../utils/metricasAdmin.js';
import { transicionesOrden, puedeEliminarOrden } from '../utils/estadosOrden.js';

describe('Métricas de ventas y transiciones de órdenes', () => {
  test('calcularMetricasOrdenes: suma solo órdenes vigentes y excluye las CANCELADA', () => {
    const ordenes = [
      { id: 1, estado: 'PAGADA', total: 10000 },
      { id: 2, estado: 'EN_PREPARACION', total: 20000 },
      { id: 3, estado: 'DESPACHADA', total: 15000 },
      { id: 4, estado: 'ENTREGADA', total: 5000 },
      { id: 5, estado: 'CANCELADA', total: 99999 }
    ];
    expect(calcularMetricasOrdenes(ordenes)).toEqual({
      totalOrdenes: 5,
      ordenesVigentes: 4,
      totalVentas: 50000
    });
  });

  test('calcularMetricasOrdenes: tolera listas vacías o nulas', () => {
    expect(calcularMetricasOrdenes([])).toEqual({ totalOrdenes: 0, ordenesVigentes: 0, totalVentas: 0 });
    expect(calcularMetricasOrdenes(null)).toEqual({ totalOrdenes: 0, ordenesVigentes: 0, totalVentas: 0 });
  });

  test('transicionesOrden: devuelve solo las transiciones válidas para cada estado', () => {
    expect(transicionesOrden('PAGADA').map((t) => t.estado)).toEqual(['EN_PREPARACION', 'CANCELADA']);
    expect(transicionesOrden('EN_PREPARACION').map((t) => t.estado)).toEqual(['DESPACHADA', 'CANCELADA']);
    expect(transicionesOrden('DESPACHADA').map((t) => t.estado)).toEqual(['ENTREGADA']);
    expect(transicionesOrden('ENTREGADA')).toEqual([]);
    expect(transicionesOrden('CANCELADA')).toEqual([]);
    expect(transicionesOrden('DESCONOCIDO')).toEqual([]);
  });

  test('puedeEliminarOrden: solo permite eliminar ENTREGADA o CANCELADA', () => {
    expect(puedeEliminarOrden('PAGADA')).toBe(false);
    expect(puedeEliminarOrden('EN_PREPARACION')).toBe(false);
    expect(puedeEliminarOrden('DESPACHADA')).toBe(false);
    expect(puedeEliminarOrden('ENTREGADA')).toBe(true);
    expect(puedeEliminarOrden('CANCELADA')).toBe(true);
  });
});

