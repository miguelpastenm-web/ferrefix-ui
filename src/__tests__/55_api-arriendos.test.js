// Test: API de arriendos: creación (solo campos permitidos), misArriendos, obtener, listar admin con filtros, editar, devolver y eliminar
// Función: crearArriendo(), misArriendos(), obtenerArriendo(), listarArriendos(), actualizarArriendo(), devolverArriendo(), eliminarArriendo()

import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import {
  crearArriendo,
  misArriendos,
  obtenerArriendo,
  listarArriendos,
  actualizarArriendo,
  devolverArriendo,
  eliminarArriendo
} from '../api/arriendos.js';
import { guardarSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend } from './helpers/fetchMock.js';

const dtoArriendo = (extra = {}) => ({
  id: 3,
  codigo: 'ARR-000003',
  estado: 'VIGENTE',
  maquina: { id: 1, codigo: 'MAQ-01', nombre: 'Martillo Bosch', marca: 'Bosch', imagenUrl: null },
  unidadCodigo: 'MAQ-01-U01',
  tarifaDia: 24990,
  dias: 3,
  fechaInicio: '2026-11-15',
  fechaFin: '2026-11-17',
  total: 74970,
  telefonoContacto: '+56 9 8765 4321',
  direccionFaena: 'Av. Obra 123',
  regionFaena: 'Región Metropolitana',
  comunaFaena: 'Santiago',
  ...extra
});

describe('API de arriendos', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
    guardarSesion({ accessToken: 'tok-cli', refreshToken: 'r' });
  });
  afterEach(() => vi.unstubAllGlobals());

  test('crearArriendo: POST /arriendos envía solo maquinaId, días, fecha y faena (sin tarifa ni total)', async () => {
    const falso = instalarFetch(() => respuestaJson(201, dtoArriendo()));
    const res = await crearArriendo({
      maquinaId: '1',
      diasArriendo: '3',
      fechaInicio: ' 2026-11-15 ',
      telefono: ' +56 9 8765 4321 ',
      direccionFaena: ' Av. Obra 123 ',
      region: ' Región Metropolitana ',
      comuna: ' Santiago ',
      tarifaDia: 1,
      total: 1
    });
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('POST');
    expect(l.ruta).toBe('/api/v1/arriendos');
    expect(l.authorization).toBe('Bearer tok-cli');
    expect(l.cuerpo).toEqual({
      maquinaId: 1,
      diasArriendo: 3,
      fechaInicio: '2026-11-15',
      telefono: '+56 9 8765 4321',
      direccionFaena: 'Av. Obra 123',
      region: 'Región Metropolitana',
      comuna: 'Santiago'
    });
    expect(res.codigo).toBe('ARR-000003');
  });

  test('misArriendos y obtenerArriendo', async () => {
    const falso = instalarFetch((l) =>
      respuestaJson(200, l.ruta.endsWith('/mis-arriendos') ? [dtoArriendo()] : dtoArriendo())
    );
    expect(await misArriendos()).toHaveLength(1);
    expect((await obtenerArriendo(3)).id).toBe(3);

    expect(llamadasDe(falso).map((l) => `${l.metodo} ${l.ruta}`)).toEqual([
      'GET /api/v1/arriendos/mis-arriendos',
      'GET /api/v1/arriendos/3'
    ]);
  });

  test('listarArriendos, actualizarArriendo, devolverArriendo y eliminarArriendo (ADMIN)', async () => {
    const falso = instalarFetch((l) => {
      if (l.metodo === 'DELETE') return respuestaJson(204);
      if (l.metodo === 'GET') return respuestaJson(200, [dtoArriendo()]);
      return respuestaJson(200, dtoArriendo({ estado: 'FINALIZADO' }));
    });

    await listarArriendos({ estado: 'VIGENTE', usuarioId: 4, maquinaId: 1 });
    await actualizarArriendo(3, {
      telefono: ' +56 9 1111 2222 ',
      direccionFaena: ' Nueva Obra 456 ',
      region: 'Región Metropolitana',
      comuna: 'Providencia'
    });
    await devolverArriendo(3);
    await eliminarArriendo(3);

    const llamadas = llamadasDe(falso);
    expect(llamadas.map((l) => `${l.metodo} ${l.ruta}`)).toEqual([
      'GET /api/v1/arriendos?estado=VIGENTE&usuarioId=4&maquinaId=1',
      'PUT /api/v1/arriendos/3',
      'PATCH /api/v1/arriendos/3/devolver',
      'DELETE /api/v1/arriendos/3'
    ]);
  });

  test('409 sin unidades disponibles llega como ApiError', async () => {
    instalarFetch(() => errorBackend(409, 'No quedan unidades disponibles para este modelo'));
    const err = await crearArriendo({
      maquinaId: 1,
      diasArriendo: 2,
      fechaInicio: '2026-11-15',
      telefono: '+56 9 8765 4321',
      direccionFaena: 'Obra 1',
      region: 'Región Metropolitana',
      comuna: 'Santiago'
    }).catch((e) => e);
    expect(err.status).toBe(409);
  });
});

