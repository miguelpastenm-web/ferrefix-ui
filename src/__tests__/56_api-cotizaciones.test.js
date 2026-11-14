// Test: API de cotizaciones: creación pública o autenticada y gestión ADMIN (listar, obtener, PATCH y DELETE)
// Función: crearCotizacion(), listarCotizaciones(), obtenerCotizacion(), actualizarCotizacion(), eliminarCotizacion()

import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import {
  crearCotizacion,
  listarCotizaciones,
  obtenerCotizacion,
  actualizarCotizacion,
  eliminarCotizacion
} from '../api/cotizaciones.js';
import { guardarSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend } from './helpers/fetchMock.js';

const DATOS = {
  nombre: ' Constructora Sur Ltda. ',
  rut: ' 76.123.456-7 ',
  email: ' contacto@sur.cl ',
  telefono: ' +56 9 8765 4321 ',
  tipoProyecto: 'Obra Gruesa y Construcción',
  region: 'Región Metropolitana',
  detalle: ' 50 sacos de cemento y 20 placas OSB ',
  despachoObra: true
};

describe('API de cotizaciones', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
  });
  afterEach(() => vi.unstubAllGlobals());

  test('crearCotizacion anónimo: POST /cotizaciones SIN Authorization', async () => {
    const falso = instalarFetch(() =>
      respuestaJson(201, { id: 10, codigo: 'COT-000010', estado: 'PENDIENTE', createdAt: '2026-11-14T10:00:00' })
    );
    const res = await crearCotizacion(DATOS);
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('POST');
    expect(l.ruta).toBe('/api/v1/cotizaciones');
    expect(l.authorization).toBeUndefined();
    expect(l.cuerpo).toEqual({
      nombre: 'Constructora Sur Ltda.',
      rut: '76.123.456-7',
      email: 'contacto@sur.cl',
      telefono: '+56 9 8765 4321',
      tipoProyecto: 'Obra Gruesa y Construcción',
      region: 'Región Metropolitana',
      detalle: '50 sacos de cemento y 20 placas OSB',
      despachoObra: true
    });
    expect(res.codigo).toBe('COT-000010');
  });

  test('crearCotizacion autenticado: envía Bearer token cuando hay sesión', async () => {
    guardarSesion({ accessToken: 'tok-cli', refreshToken: 'r' });
    const falso = instalarFetch(() =>
      respuestaJson(201, { id: 11, codigo: 'COT-000011', estado: 'PENDIENTE', createdAt: '2026-11-14T10:00:00' })
    );
    await crearCotizacion(DATOS);
    expect(llamadasDe(falso)[0].authorization).toBe('Bearer tok-cli');
  });

  test('listarCotizaciones, obtenerCotizacion, actualizarCotizacion y eliminarCotizacion (ADMIN)', async () => {
    guardarSesion({ accessToken: 'tok-admin', refreshToken: 'r' });
    const falso = instalarFetch((l) => {
      if (l.metodo === 'DELETE') return respuestaJson(204);
      if (l.metodo === 'GET' && l.ruta.startsWith('/api/v1/cotizaciones?')) {
        return respuestaJson(200, [{ id: 10, codigo: 'COT-000010', estado: 'PENDIENTE' }]);
      }
      return respuestaJson(200, { id: 10, codigo: 'COT-000010', estado: 'RESPONDIDA', notaAdmin: 'Enviada' });
    });

    const lista = await listarCotizaciones({ estado: 'PENDIENTE' });
    expect(lista).toHaveLength(1);
    await obtenerCotizacion(10);
    await actualizarCotizacion(10, { estado: 'RESPONDIDA', notaAdmin: 'Enviada' });
    await eliminarCotizacion(10);

    const llamadas = llamadasDe(falso);
    expect(llamadas.map((l) => `${l.metodo} ${l.ruta}`)).toEqual([
      'GET /api/v1/cotizaciones?estado=PENDIENTE',
      'GET /api/v1/cotizaciones/10',
      'PATCH /api/v1/cotizaciones/10',
      'DELETE /api/v1/cotizaciones/10'
    ]);
    expect(llamadas[2].cuerpo).toEqual({ estado: 'RESPONDIDA', notaAdmin: 'Enviada' });
  });

  test('400 de validación llega como ApiError con detalles', async () => {
    instalarFetch(() => errorBackend(400, 'Datos de entrada inválidos', ['rut: El RUT ingresado no es válido']));
    const err = await crearCotizacion(DATOS).catch((e) => e);
    expect(err.status).toBe(400);
    expect(err.detalles).toEqual(['rut: El RUT ingresado no es válido']);
  });
});

