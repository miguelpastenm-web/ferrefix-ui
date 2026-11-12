// Test: Almacén de sesión: guarda y lee solo los tokens, ignora datos corruptos, sigue funcionando en memoria si localStorage falla y avisa los cambios hechos desde otra pestaña
// Función: leerSesion(), guardarSesion(), borrarSesion(), suscribirCambios()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { CLAVE_SESION, leerSesion, guardarSesion, borrarSesion, suscribirCambios } from '../api/sesionAlmacen.js';

describe('Almacén de sesión', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    borrarSesion();
  });

  test('guardarSesion / leerSesion / borrarSesion: ida y vuelta, y solo se persisten los tokens', () => {
    expect(leerSesion()).toBeNull();

    guardarSesion({ accessToken: 'a1', refreshToken: 'r1' });
    expect(leerSesion()).toEqual({ accessToken: 'a1', refreshToken: 'r1' });
    expect(JSON.parse(localStorage.getItem(CLAVE_SESION))).toEqual({ accessToken: 'a1', refreshToken: 'r1' });
    expect(CLAVE_SESION).toBe('ferrefix_auth_v2');

    guardarSesion({ accessToken: 'a2', refreshToken: 'r2' });
    expect(leerSesion().accessToken).toBe('a2');

    borrarSesion();
    expect(leerSesion()).toBeNull();
    expect(localStorage.getItem(CLAVE_SESION)).toBeNull();
  });

  test('leerSesion: JSON corrupto o sin alguno de los dos tokens se trata como sin sesión', () => {
    localStorage.setItem(CLAVE_SESION, '{no es json');
    expect(leerSesion()).toBeNull();
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ accessToken: 'solo-access' }));
    expect(leerSesion()).toBeNull();
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ accessToken: '', refreshToken: 'r' }));
    expect(leerSesion()).toBeNull();
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ accessToken: 123, refreshToken: 456 }));
    expect(leerSesion()).toBeNull();
    localStorage.setItem(CLAVE_SESION, 'null');
    expect(leerSesion()).toBeNull();
  });

  test('Si no se puede escribir en localStorage (cuota llena o modo privado) la sesión sigue funcionando en memoria', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    guardarSesion({ accessToken: 'mem-a', refreshToken: 'mem-r' });
    expect(leerSesion()).toEqual({ accessToken: 'mem-a', refreshToken: 'mem-r' });

    borrarSesion();
    expect(leerSesion()).toBeNull();
  });

  test('Si ni siquiera se puede leer localStorage, se usa la copia en memoria y no se lanza ningún error', () => {
    guardarSesion({ accessToken: 'a', refreshToken: 'r' });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(leerSesion()).toEqual({ accessToken: 'a', refreshToken: 'r' });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => borrarSesion()).not.toThrow();
  });

  test('suscribirCambios: avisa cuando OTRA pestaña cambia o borra la sesión, ignora otras claves y se puede cancelar', () => {
    const aviso = vi.fn();
    const cancelar = suscribirCambios(aviso);

    window.dispatchEvent(new StorageEvent('storage', { key: CLAVE_SESION }));
    expect(aviso).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new StorageEvent('storage', { key: null })); // localStorage.clear() en otra pestaña
    expect(aviso).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new StorageEvent('storage', { key: 'ferrefix_carrito_v1' }));
    expect(aviso).toHaveBeenCalledTimes(2);

    cancelar();
    window.dispatchEvent(new StorageEvent('storage', { key: CLAVE_SESION }));
    expect(aviso).toHaveBeenCalledTimes(2);
  });
});
