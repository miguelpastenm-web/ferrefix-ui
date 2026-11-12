// Test: ApiError y erroresPorCampo: conserva status, mensaje y detalles del backend, y convierte los "campo: mensaje" en errores por campo (primer mensaje por campo)
// Función: ApiError, erroresPorCampo(), mensajeDeError(), mensajePorEstado()

import { describe, test, expect } from 'vitest';
import { ApiError, erroresPorCampo, mensajeDeError, mensajePorEstado, MENSAJE_SIN_CONEXION } from '../api/errores.js';

describe('ApiError', () => {
  test('ApiError: guarda status, mensaje y detalles; sin mensaje usa uno por defecto según el estado', () => {
    const e = new ApiError({ status: 409, mensaje: 'Ya existe una cuenta', detalles: ['a: b'], ruta: '/api/v1/auth/register' });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('ApiError');
    expect(e.status).toBe(409);
    expect(e.mensaje).toBe('Ya existe una cuenta');
    expect(e.message).toBe('Ya existe una cuenta');
    expect(e.detalles).toEqual(['a: b']);
    expect(e.ruta).toBe('/api/v1/auth/register');

    expect(new ApiError({ status: 403 }).mensaje).toBe(mensajePorEstado(403));
    expect(new ApiError({ status: 404 }).mensaje).toContain('No se encontró');
    expect(new ApiError({ status: 500 }).mensaje).toContain('Error del servidor');
    expect(new ApiError({ status: 418 }).mensaje).toBe('No se pudo completar la solicitud.');
    expect(new ApiError({ status: 400, detalles: 'no es lista' }).detalles).toEqual([]);
  });

  test('ApiError: distingue "sin respuesta" (status 0) y errores transitorios (red o 5xx) de los rechazos del servidor', () => {
    const red = new ApiError({ status: 0, mensaje: MENSAJE_SIN_CONEXION });
    expect(red.esDeRed).toBe(true);
    expect(red.esTransitorio).toBe(true);
    expect(new ApiError({ status: 503 }).esTransitorio).toBe(true);
    expect(new ApiError({ status: 503 }).esDeRed).toBe(false);
    for (const status of [400, 401, 403, 404, 409]) {
      expect(new ApiError({ status }).esTransitorio).toBe(false);
    }
  });
});

describe('erroresPorCampo', () => {
  test('erroresPorCampo: separa "campo: mensaje" y conserva el primer mensaje de cada campo', () => {
    const e = new ApiError({
      status: 400,
      detalles: [
        'email: El correo debe tener un formato válido',
        'password: La contraseña debe tener entre 8 y 72 caracteres',
        'email: El correo es obligatorio'
      ]
    });
    expect(erroresPorCampo(e)).toEqual({
      email: 'El correo debe tener un formato válido',
      password: 'La contraseña debe tener entre 8 y 72 caracteres'
    });
  });

  test('erroresPorCampo: tolera campos anidados, mensajes con ": " y detalles malformados', () => {
    const e = new ApiError({
      status: 400,
      detalles: ['items[0].cantidad: La cantidad mínima por producto es 1', 'nombre: Debe incluir: letras', 'sin separador', ': vacío', 'campo: ', '', null]
    });
    expect(erroresPorCampo(e)).toEqual({
      'items[0].cantidad': 'La cantidad mínima por producto es 1',
      nombre: 'Debe incluir: letras'
    });
  });

  test('erroresPorCampo: errores que no son de la API o sin detalles dan un objeto vacío', () => {
    expect(erroresPorCampo(new ApiError({ status: 401 }))).toEqual({});
    expect(erroresPorCampo(new Error('x'))).toEqual({});
    expect(erroresPorCampo(null)).toEqual({});
    expect(erroresPorCampo(undefined)).toEqual({});
  });
});

describe('mensajeDeError', () => {
  test('mensajeDeError: usa el mensaje del ApiError y uno genérico para cualquier otro error', () => {
    expect(mensajeDeError(new ApiError({ status: 409, mensaje: 'Sin stock' }))).toBe('Sin stock');
    expect(mensajeDeError(new Error('interno'))).toContain('error inesperado');
    expect(mensajeDeError(new Error('interno'), 'Mensaje propio')).toBe('Mensaje propio');
  });
});
