// Test: Estados de orden e historial: cada estado del backend tiene su insignia, uno desconocido no rompe, y las fechas se muestran como texto sin conversión de zona
// Función: infoEstadoOrden(), etiquetaMetodoPago(), formatearFechaOrden()

import { describe, test, expect } from 'vitest';
import { ESTADOS_ORDEN, infoEstadoOrden, METODOS_PAGO, etiquetaMetodoPago, formatearFechaOrden } from '../utils/estadosOrden.js';

describe('Estados de orden', () => {
  test('Los 5 estados del backend tienen etiqueta e insignia distintas', () => {
    expect(Object.keys(ESTADOS_ORDEN)).toEqual(['PAGADA', 'EN_PREPARACION', 'DESPACHADA', 'ENTREGADA', 'CANCELADA']);
    expect(infoEstadoOrden('PAGADA').etiqueta).toBe('Pagada');
    expect(infoEstadoOrden('EN_PREPARACION').etiqueta).toBe('En preparación');
    expect(infoEstadoOrden('DESPACHADA').etiqueta).toBe('Despachada');
    expect(infoEstadoOrden('ENTREGADA').etiqueta).toBe('Entregada');
    expect(infoEstadoOrden('CANCELADA').etiqueta).toBe('Cancelada');
    const clases = new Set(Object.keys(ESTADOS_ORDEN).map((e) => infoEstadoOrden(e).clase));
    expect(clases.size).toBe(5);
  });

  test('Un estado desconocido o ausente se muestra tal cual con una insignia neutra, sin lanzar', () => {
    expect(infoEstadoOrden('REEMBOLSADA')).toMatchObject({ etiqueta: 'REEMBOLSADA' });
    expect(infoEstadoOrden('REEMBOLSADA').clase).toContain('secondary');
    expect(infoEstadoOrden(null).etiqueta).toBe('Sin estado');
    expect(infoEstadoOrden(undefined).etiqueta).toBe('Sin estado');
  });

  test('Medios de pago: valor del enum del backend -> texto del checkout', () => {
    expect(METODOS_PAGO.map((m) => m.valor)).toEqual(['WEBPAY_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA']);
    expect(etiquetaMetodoPago('TARJETA_CREDITO')).toContain('Tarjeta de Crédito');
    expect(etiquetaMetodoPago('OTRO')).toBe('OTRO');
    expect(etiquetaMetodoPago(undefined)).toBe('—');
  });

  test('formatearFechaOrden: reordena el texto ISO sin pasar por Date (sin conversión de zona)', () => {
    expect(formatearFechaOrden('2026-11-12T10:30:15')).toBe('12-11-2026 10:30');
    expect(formatearFechaOrden('2026-11-12T23:59:59')).toBe('12-11-2026 23:59'); // no pasa al día siguiente
    expect(formatearFechaOrden('2026-01-01T00:05:00.123456')).toBe('01-01-2026 00:05');
    // Incluso con sufijo de zona se conservan los mismos dígitos: nunca se desplaza la hora
    expect(formatearFechaOrden('2026-11-12T23:59:00Z')).toBe('12-11-2026 23:59');
    expect(formatearFechaOrden('2026-11-12T23:59:00-03:00')).toBe('12-11-2026 23:59');
  });

  test('formatearFechaOrden: lo que no calza se devuelve tal cual y lo que no es texto da "—"', () => {
    expect(formatearFechaOrden('ayer')).toBe('ayer');
    expect(formatearFechaOrden(null)).toBe('—');
    expect(formatearFechaOrden(undefined)).toBe('—');
    expect(formatearFechaOrden(12345)).toBe('—');
  });
});
