// Test: Errores del Admin: clasifica 400 por campo, 404, 409 (SKU, transición, recurso ocupado), red caída o 5xx sin confirmar, sesión vencida y permisos
// Función: clasificarErrorAdmin()

import { describe, test, expect } from 'vitest';
import { clasificarErrorAdmin, MENSAJE_OPERACION_SIN_CONFIRMAR, MENSAJE_SESION_VENCIDA } from '../utils/errorAdmin.js';
import { ApiError } from '../api/errores.js';

const e = (status, mensaje = 'mensaje', detalles = []) => new ApiError({ status, mensaje, detalles });

describe('clasificarErrorAdmin', () => {
  test('400 con detalles: cada mensaje queda asociado a su campo', () => {
    const c = clasificarErrorAdmin(e(400, 'Datos de entrada inválidos', ['precioVenta: El precio debe ser mayor a 0', 'sku: El SKU es obligatorio']));
    expect(c.tipo).toBe('validacion');
    expect(c.campos).toEqual({ precioVenta: 'El precio debe ser mayor a 0', sku: 'El SKU es obligatorio' });
  });

  test('400 de categoría inválida (viene solo en el mensaje) se asocia al campo categoría', () => {
    const c = clasificarErrorAdmin(e(400, 'Categoría inválida. Valores permitidos: Construcción, Maderas'));
    expect(c.tipo).toBe('validacion');
    expect(c.campos.categoria).toMatch(/Categoría inválida/);
  });

  test('400/413 de imagen: validación con el mensaje del servidor', () => {
    expect(clasificarErrorAdmin(e(400, 'El archivo no es una imagen válida. Formatos permitidos: JPEG, PNG, WEBP y AVIF')).tipo).toBe('validacion');
    const grande = clasificarErrorAdmin(e(413, 'El archivo supera el tamaño máximo permitido (6 MB)'));
    expect(grande.tipo).toBe('validacion');
    expect(grande.mensaje).toBe('El archivo supera el tamaño máximo permitido (6 MB)');
  });

  test('404: "no existe" (hay que refrescar la lista)', () => {
    const c = clasificarErrorAdmin(e(404, 'Producto no encontrado: 9'));
    expect(c.tipo).toBe('no-existe');
    expect(c.mensaje).toBe('Producto no encontrado: 9');
  });

  test('409 por SKU repetido: conflicto con el mensaje en el campo sku (al crear y al editar)', () => {
    expect(clasificarErrorAdmin(e(409, 'Ya existe un producto con el SKU ABC-1'))).toMatchObject({ tipo: 'conflicto', campos: { sku: 'Ya existe un producto con el SKU ABC-1' } });
    expect(clasificarErrorAdmin(e(409, 'Ya existe otro producto con el SKU ABC-1')).campos.sku).toMatch(/otro producto/);
  });

  test('409 de transición o de estado: conflicto sin campo', () => {
    const c = clasificarErrorAdmin(e(409, 'Transición no permitida: DESPACHADA → CANCELADA'));
    expect(c.tipo).toBe('conflicto');
    expect(c.campos).toEqual({});
  });

  test('409 por recurso ocupado: se distingue para ofrecer "Reintentar" manual', () => {
    const c = clasificarErrorAdmin(e(409, 'El recurso está siendo modificado por otra operación. Intente nuevamente'));
    expect(c.tipo).toBe('ocupado');
  });

  test('sin respuesta (status 0) o 5xx: NO se sabe si se aplicó -> mensaje de "no pudimos confirmar"', () => {
    expect(clasificarErrorAdmin(e(0, 'No se pudo conectar'))).toMatchObject({ tipo: 'sin-confirmar', mensaje: MENSAJE_OPERACION_SIN_CONFIRMAR });
    expect(clasificarErrorAdmin(e(503)).tipo).toBe('sin-confirmar');
    expect(clasificarErrorAdmin(e(500)).tipo).toBe('sin-confirmar');
    expect(MENSAJE_OPERACION_SIN_CONFIRMAR).toBe('No pudimos confirmar la operación; revisa la lista antes de volver a intentar');
  });

  test('401: sesión vencida; 403: sin permisos', () => {
    expect(clasificarErrorAdmin(e(401, 'Token ausente, inválido o vencido'))).toMatchObject({ tipo: 'sesion', mensaje: MENSAJE_SESION_VENCIDA });
    expect(clasificarErrorAdmin(e(403)).tipo).toBe('permiso');
  });

  test('un error que no es de la API da un mensaje genérico sin lanzar', () => {
    expect(clasificarErrorAdmin(new Error('boom')).tipo).toBe('otro');
    expect(clasificarErrorAdmin(null).tipo).toBe('otro');
  });
});
