// Test: API de máquinas: catálogo público (con filtros), adaptación de imagenUrl, CRUD admin y gestión de unidades
// Función: listarMaquinas(), obtenerMaquina(), crearMaquina(), actualizarMaquina(), eliminarMaquina(), listarUnidadesMaquina(), agregarUnidadesMaquina(), eliminarUnidadMaquina(), adaptarMaquina()

import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import {
  listarMaquinas,
  obtenerMaquina,
  crearMaquina,
  actualizarMaquina,
  eliminarMaquina,
  listarUnidadesMaquina,
  agregarUnidadesMaquina,
  eliminarUnidadMaquina,
  adaptarMaquina
} from '../api/maquinas.js';
import { guardarSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend } from './helpers/fetchMock.js';

const dtoMaquina = (id = 1, extra = {}) => ({
  id,
  codigo: `MAQ-0${id}`,
  nombre: `Demoledor ${id}`,
  marca: 'Bosch',
  categoria: 'Demolición',
  tarifaDia: 24990,
  estado: 'DISPONIBLE',
  incluye: 'Maleta',
  imagenUrl: `/media/maquinas/m${id}.webp`,
  especificaciones: { Potencia: '1750 W' },
  unidadesTotales: 3,
  unidadesDisponibles: 2,
  createdAt: '2026-01-01T10:00:00',
  updatedAt: '2026-01-01T10:00:00',
  ...extra
});

describe('API de máquinas', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
    guardarSesion({ accessToken: 'tok-admin', refreshToken: 'r' });
  });
  afterEach(() => vi.unstubAllGlobals());

  test('listarMaquinas: GET público sin Authorization, con filtros opcionales y adapta imagenUrl', async () => {
    const falso = instalarFetch(() => respuestaJson(200, [dtoMaquina(1)]));
    const lista = await listarMaquinas({ q: 'bosch', categoria: 'Todas', soloDisponibles: true, sort: 'tarifa,asc' });
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('GET');
    expect(l.ruta).toBe('/api/v1/maquinas?q=bosch&soloDisponibles=true&sort=tarifa%2Casc');
    expect(l.authorization).toBeUndefined();
    expect(lista[0].imagen).toMatch(/\/media\/maquinas\/m1\.webp$/);
    expect(lista[0].unidadesDisponibles).toBe(2);
  });

  test('obtenerMaquina: GET público /maquinas/{id}', async () => {
    const falso = instalarFetch(() => respuestaJson(200, dtoMaquina(5)));
    const maq = await obtenerMaquina(5);
    const [l] = llamadasDe(falso);
    expect(l.ruta).toBe('/api/v1/maquinas/5');
    expect(l.authorization).toBeUndefined();
    expect(maq.codigo).toBe('MAQ-05');
  });

  test('crearMaquina, actualizarMaquina y eliminarMaquina envían Bearer y los métodos correctos', async () => {
    const falso = instalarFetch((l) => {
      if (l.metodo === 'DELETE') return respuestaJson(204);
      return respuestaJson(l.metodo === 'POST' ? 201 : 200, dtoMaquina(9));
    });

    await crearMaquina({ codigo: 'MAQ-09', nombre: 'Nueva' });
    await actualizarMaquina(9, { codigo: 'MAQ-09', nombre: 'Editada' });
    await eliminarMaquina(9);

    const llamadas = llamadasDe(falso);
    expect(llamadas.map((l) => `${l.metodo} ${l.ruta}`)).toEqual([
      'POST /api/v1/maquinas',
      'PUT /api/v1/maquinas/9',
      'DELETE /api/v1/maquinas/9'
    ]);
    expect(llamadas.every((l) => l.authorization === 'Bearer tok-admin')).toBe(true);
  });

  test('listarUnidadesMaquina, agregarUnidadesMaquina y eliminarUnidadMaquina', async () => {
    const falso = instalarFetch((l) => {
      if (l.metodo === 'DELETE') return respuestaJson(204);
      return respuestaJson(l.metodo === 'POST' ? 201 : 200, [{ id: 10, codigo: 'MAQ-01-U01', estado: 'DISPONIBLE' }]);
    });

    const unidades = await listarUnidadesMaquina(1);
    expect(unidades).toHaveLength(1);
    await agregarUnidadesMaquina(1, 3);
    await eliminarUnidadMaquina(1, 10);

    const llamadas = llamadasDe(falso);
    expect(llamadas.map((l) => `${l.metodo} ${l.ruta}`)).toEqual([
      'GET /api/v1/maquinas/1/unidades',
      'POST /api/v1/maquinas/1/unidades',
      'DELETE /api/v1/maquinas/1/unidades/10'
    ]);
    expect(llamadas[1].cuerpo).toEqual({ cantidad: 3 });
  });

  test('adaptarMaquina tolera valores faltantes y los errores 409 llegan como ApiError', async () => {
    const adaptada = adaptarMaquina({ id: 2, codigo: 'M2', nombre: 'X', marca: 'Y', categoria: 'Z', tarifaDia: 1000, estado: 'NO_DISPONIBLE' });
    expect(adaptada.especificaciones).toEqual({});
    expect(adaptada.unidadesTotales).toBe(0);

    instalarFetch(() => errorBackend(409, 'Tiene arriendos registrados'));
    const err = await eliminarMaquina(2).catch((e) => e);
    expect(err.status).toBe(409);
  });
});

