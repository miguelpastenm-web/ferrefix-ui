// Test: Endpoints de autenticación y perfil: envían exactamente los cuerpos que espera el backend (login, registro, refresh, me y PUT /users/me)
// Función: login(), registrar(), refrescar(), obtenerMe(), actualizarPerfil()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { login, registrar, refrescar, obtenerMe } from '../api/auth.js';
import { actualizarPerfil } from '../api/usuarios.js';
import { guardarSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { instalarFetch, llamadasDe, respuestaJson, tokensDe, USUARIO_CLIENTE } from './helpers/fetchMock.js';

describe('API de autenticación y perfil', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('login: POST /auth/login con email recortado y contraseña intacta, sin Authorization', async () => {
    guardarSesion({ accessToken: 'viejo', refreshToken: 'r' });
    const falso = instalarFetch(() => respuestaJson(200, tokensDe(USUARIO_CLIENTE)));
    const tokens = await login({ email: '  cliente@ferrefix.cl  ', password: ' con espacios ' });
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('POST');
    expect(l.ruta).toBe('/api/v1/auth/login');
    expect(l.cuerpo).toEqual({ email: 'cliente@ferrefix.cl', password: ' con espacios ' });
    expect(l.authorization).toBeUndefined();
    expect(tokens.accessToken).toBe('access-1');
    expect(tokens.usuario.roles).toEqual(['CLIENTE']);
  });

  test('registrar: POST /auth/register con rut, nombre, email y clave; los opcionales que no se envían no viajan', async () => {
    const falso = instalarFetch(() => respuestaJson(201, tokensDe(USUARIO_CLIENTE)));
    await registrar({ rut: '12.345.678-5', nombre: '  Ana Pérez ', email: ' ana@correo.cl ', password: 'segura123' });
    let [l] = llamadasDe(falso);
    expect(l.ruta).toBe('/api/v1/auth/register');
    expect(l.cuerpo).toEqual({ rut: '12.345.678-5', nombre: 'Ana Pérez', email: 'ana@correo.cl', password: 'segura123' });
    expect(Object.keys(l.cuerpo)).not.toContain('telefono');

    await registrar({ rut: '1-9', nombre: 'X', email: 'x@y.cl', password: '12345678', telefono: '+56 9 1234 5678', region: 'Región Metropolitana' });
    [, l] = llamadasDe(falso);
    expect(l.cuerpo.telefono).toBe('+56 9 1234 5678');
    expect(l.cuerpo.region).toBe('Región Metropolitana');
  });

  test('refrescar: POST /auth/refresh con el refresh token, sin Authorization', async () => {
    const falso = instalarFetch(() => respuestaJson(200, tokensDe(USUARIO_CLIENTE, 'a2', 'r2')));
    const tokens = await refrescar('refresh-1');
    const [l] = llamadasDe(falso);
    expect(l.ruta).toBe('/api/v1/auth/refresh');
    expect(l.cuerpo).toEqual({ refreshToken: 'refresh-1' });
    expect(l.authorization).toBeUndefined();
    expect(tokens.refreshToken).toBe('r2');
  });

  test('obtenerMe: GET /auth/me con el Bearer de la sesión', async () => {
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
    const falso = instalarFetch(() => respuestaJson(200, USUARIO_CLIENTE));
    const usuario = await obtenerMe();
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('GET');
    expect(l.ruta).toBe('/api/v1/auth/me');
    expect(l.authorization).toBe('Bearer tok');
    expect(usuario.email).toBe('cliente@ferrefix.cl');
  });

  test('actualizarPerfil: PUT /users/me con SOLO los cinco campos editables (RUT, email y clave no viajan) y Bearer', async () => {
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
    const falso = instalarFetch(() => respuestaJson(200, { ...USUARIO_CLIENTE, nombre: 'Nuevo' }));
    const actualizado = await actualizarPerfil({
      nombre: 'Nuevo', telefono: '+56 9 8765 4321', direccion: 'Av. 1', region: 'Región Metropolitana', comuna: 'Providencia',
      rut: '1-9', email: 'otro@x.cl', password: 'x', roles: ['ADMIN']
    });
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('PUT');
    expect(l.ruta).toBe('/api/v1/users/me');
    expect(l.authorization).toBe('Bearer tok');
    expect(Object.keys(l.cuerpo).sort()).toEqual(['comuna', 'direccion', 'nombre', 'region', 'telefono']);
    expect(l.cuerpo.nombre).toBe('Nuevo');
    expect(actualizado.nombre).toBe('Nuevo');
  });
});
