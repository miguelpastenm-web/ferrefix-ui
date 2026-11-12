// Test: Estimación de envío: gratis solo sobre $50.000 (en $50.000 exactos se cobra) y los textos no mencionan "Región Metropolitana"
// Función: estimarEnvio(), TEXTO_ENVIO_GRATIS, NOTA_ESTIMACION

import { describe, test, expect } from 'vitest';
import { estimarEnvio, TEXTO_ENVIO_GRATIS, NOTA_ESTIMACION, COSTO_ENVIO_ESTIMADO, UMBRAL_ENVIO_GRATIS_ESTIMADO } from '../utils/envio.js';
import { calcularTotales } from '../data/carrito.js';

describe('Estimación de envío', () => {
  test('estimarEnvio: sin productos no cobra; hasta $50.000 inclusive cobra $3.990; desde $50.001 es gratis', () => {
    expect(estimarEnvio(0)).toBe(0);
    expect(estimarEnvio(1)).toBe(3990);
    expect(estimarEnvio(49999)).toBe(3990);
    expect(estimarEnvio(50000)).toBe(3990);
    expect(estimarEnvio(50001)).toBe(0);
    expect(estimarEnvio(null)).toBe(0);
    expect(estimarEnvio('abc')).toBe(0);
    expect(UMBRAL_ENVIO_GRATIS_ESTIMADO).toBe(50000);
    expect(COSTO_ENVIO_ESTIMADO).toBe(3990);
  });

  test('El texto de envío gratis no menciona la Región Metropolitana y la nota deja claro que es una estimación', () => {
    expect(TEXTO_ENVIO_GRATIS).toBe('Despacho gratis en compras superiores a $50.000.');
    expect(TEXTO_ENVIO_GRATIS).not.toMatch(/región metropolitana/i);
    expect(NOTA_ESTIMACION).toMatch(/estimad/i);
    expect(NOTA_ESTIMACION).toMatch(/servidor/i);
    expect(NOTA_ESTIMACION).not.toMatch(/región metropolitana/i);
  });

  test('calcularTotales: usa la estimación (despachoEstimado y totalEstimado)', () => {
    const totales = calcularTotales([{ precioVenta: 20000, cantidad: 2 }, { precioVenta: 5000, cantidad: 1 }]);
    expect(totales).toEqual({ totalArticulos: 3, subtotal: 45000, despachoEstimado: 3990, totalEstimado: 48990 });
    expect(calcularTotales([])).toEqual({ totalArticulos: 0, subtotal: 0, despachoEstimado: 0, totalEstimado: 0 });
  });
});
