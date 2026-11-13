// Test: Métricas del Admin: cuenta productos, stock crítico (1 a 5) y agotados por separado, y calcula el valor del inventario con precio por stock
// Función: calcularMetricasProductos(), esStockCritico(), esAgotado()

import { describe, test, expect } from 'vitest';
import { calcularMetricasProductos, esAgotado, esStockCritico, requiereReposicion, UMBRAL_STOCK_CRITICO } from '../utils/metricasAdmin.js';

const P = (stock, precioVenta = 1000, estado) => ({ stock, precioVenta, estado: estado ?? (stock > 0 ? 'DISPONIBLE' : 'AGOTADO') });

describe('Métricas de productos', () => {
  test('el umbral crítico es 5 y los agotados (0) se cuentan aparte de los críticos (1 a 5)', () => {
    expect(UMBRAL_STOCK_CRITICO).toBe(5);
    const m = calcularMetricasProductos([P(0), P(1), P(5), P(6), P(100)]);
    expect(m.totalProductos).toBe(5);
    expect(m.stockCritico).toBe(2); // 1 y 5
    expect(m.agotados).toBe(1); // 0
  });

  test('esAgotado: stock 0 o estado AGOTADO; esStockCritico excluye a los agotados; requiereReposicion une ambos', () => {
    expect(esAgotado(P(0))).toBe(true);
    expect(esAgotado(P(4, 1, 'AGOTADO'))).toBe(true); // el estado manda aunque el stock diga otra cosa
    expect(esAgotado(P(1))).toBe(false);
    expect(esStockCritico(P(0))).toBe(false);
    expect(esStockCritico(P(5))).toBe(true);
    expect(esStockCritico(P(6))).toBe(false);
    expect([P(0), P(3), P(9)].map(requiereReposicion)).toEqual([true, true, false]);
  });

  test('valor del inventario = suma de precio × stock; un stock negativo no resta', () => {
    const m = calcularMetricasProductos([P(2, 1000), P(3, 500), P(0, 99999), P(-4, 100)]);
    expect(m.valorInventario).toBe(2 * 1000 + 3 * 500);
  });

  test('sin productos o con datos raros devuelve ceros sin lanzar', () => {
    const cero = { totalProductos: 0, stockCritico: 0, agotados: 0, valorInventario: 0 };
    expect(calcularMetricasProductos([])).toEqual(cero);
    expect(calcularMetricasProductos(null)).toEqual(cero);
    expect(calcularMetricasProductos(undefined)).toEqual(cero);
    expect(calcularMetricasProductos([{ stock: 'x', precioVenta: 'y' }]).valorInventario).toBe(0);
  });
});
