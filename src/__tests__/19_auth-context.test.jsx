// Test: AuthContext: restaura la sesión al abrir la página, inicia y cierra sesión, y conserva o limpia los tokens según el fallo
// Función: AuthProvider(), useAuth()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext.jsx';
import { useAuth } from '../context/authContexto.js';
import { guardarSesion, leerSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, tokensDe, USUARIO_CLIENTE, USUARIO_ADMIN } from './helpers/fetchMock.js';

let auth;
function Sonda() {
  const valor = useAuth();
  useEffect(() => {
    auth = valor; // sin lista de dependencias: tras cada render los tests ven el valor actual
  });
  return (
    <div>
      <p data-testid="estado">{valor.cargando ? 'cargando' : valor.autenticado ? `usuario:${valor.usuario.nombre}` : 'anonimo'}</p>
      <p data-testid="roles">{valor.roles.join(',')}</p>
      <p data-testid="error">{valor.errorArranque ? valor.errorArranque.mensaje : ''}</p>
    </div>
  );
}
const montar = () =>
  render(
    <AuthProvider>
      <Sonda />
    </AuthProvider>
  );

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Sin tokens guardados: queda anónimo de inmediato y no llama a la API', () => {
    const falso = instalarFetch(() => respuestaJson(200, {}));
    montar();
    expect(screen.getByTestId('estado').textContent).toBe('anonimo');
    expect(falso).not.toHaveBeenCalled();
  });

  test('Con tokens guardados: arranca "cargando", consulta /auth/me con el Bearer y deja al usuario con sus roles', async () => {
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
    const falso = instalarFetch(() => respuestaJson(200, USUARIO_CLIENTE));
    montar();
    expect(screen.getByTestId('estado').textContent).toBe('cargando');
    await waitFor(() => expect(screen.getByTestId('estado').textContent).toBe('usuario:Juan Maestro'));
    expect(screen.getByTestId('roles').textContent).toBe('CLIENTE');
    const [l] = llamadasDe(falso);
    expect(l.ruta).toBe('/api/v1/auth/me');
    expect(l.authorization).toBe('Bearer tok');
    await waitFor(() => expect(auth.esCliente).toBe(true)); // `auth` se asigna en un efecto, un instante después del render
    expect(auth.esAdmin).toBe(false);
    expect(auth.tieneRol('ADMIN', 'CLIENTE')).toBe(true);
  });

  test('Access vencido al recargar: renueva UNA vez, guarda los tokens nuevos y restaura al usuario', async () => {
    guardarSesion({ accessToken: 'viejo', refreshToken: 'refresh-1' });
    const falso = instalarFetch((l) => {
      if (l.ruta === '/api/v1/auth/refresh') return respuestaJson(200, tokensDe(USUARIO_ADMIN, 'nuevo', 'refresh-2'));
      return l.authorization === 'Bearer nuevo' ? respuestaJson(200, USUARIO_ADMIN) : errorBackend(401, 'vencido');
    });
    montar();
    await waitFor(() => expect(screen.getByTestId('estado').textContent).toBe('usuario:Administrador Ferrefix'));
    expect(llamadasDe(falso).filter((l) => l.ruta === '/api/v1/auth/refresh')).toHaveLength(1);
    expect(leerSesion()).toEqual({ accessToken: 'nuevo', refreshToken: 'refresh-2' });
  });

  test('Si el servidor rechaza la renovación: queda anónimo y se borran los tokens', async () => {
    guardarSesion({ accessToken: 'viejo', refreshToken: 'malo' });
    instalarFetch(() => errorBackend(401, 'inválido'));
    montar();
    await waitFor(() => expect(screen.getByTestId('estado').textContent).toBe('anonimo'));
    expect(leerSesion()).toBeNull();
  });

  test('Si la API no responde al abrir la página: queda anónimo en pantalla, CONSERVA los tokens y guarda el error de arranque', async () => {
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
    instalarFetch(() => new TypeError('Failed to fetch'));
    montar();
    await waitFor(() => expect(screen.getByTestId('estado').textContent).toBe('anonimo'));
    expect(leerSesion()).toEqual({ accessToken: 'tok', refreshToken: 'r' });
    expect(screen.getByTestId('error').textContent).not.toBe('');
  });

  test('login: guarda SOLO los tokens (no el usuario) y deja la sesión iniciada; registrar hace lo mismo', async () => {
    instalarFetch(() => respuestaJson(200, tokensDe(USUARIO_CLIENTE, 'a1', 'r1')));
    montar();
    await act(async () => {
      await auth.login({ email: 'cliente@ferrefix.cl', password: 'cliente123' });
    });
    expect(screen.getByTestId('estado').textContent).toBe('usuario:Juan Maestro');
    expect(leerSesion()).toEqual({ accessToken: 'a1', refreshToken: 'r1' });
    expect(JSON.stringify(Object.values(localStorage))).not.toContain('Juan Maestro');

    act(() => auth.logout());
    instalarFetch(() => respuestaJson(201, tokensDe(USUARIO_ADMIN, 'a2', 'r2')));
    await act(async () => {
      await auth.registrar({ rut: '1-9', nombre: 'X', email: 'x@y.cl', password: '12345678' });
    });
    expect(screen.getByTestId('roles').textContent).toBe('ADMIN');
    expect(leerSesion().accessToken).toBe('a2');
  });

  test('login con credenciales inválidas: lanza el ApiError, no guarda nada y sigue anónimo', async () => {
    instalarFetch(() => errorBackend(401, 'Credenciales inválidas'));
    montar();
    let error;
    await act(async () => {
      error = await auth.login({ email: 'a@b.cl', password: 'mala' }).catch((e) => e);
    });
    expect(error.status).toBe(401);
    expect(leerSesion()).toBeNull();
    expect(screen.getByTestId('estado').textContent).toBe('anonimo');
  });

  test('logout: borra los tokens y deja la sesión anónima', async () => {
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
    instalarFetch(() => respuestaJson(200, USUARIO_CLIENTE));
    montar();
    await waitFor(() => expect(auth.autenticado).toBe(true));
    act(() => auth.logout());
    expect(screen.getByTestId('estado').textContent).toBe('anonimo');
    expect(leerSesion()).toBeNull();
  });

  test('actualizarUsuario: mezcla los cambios en el usuario en memoria sin tocar los tokens', async () => {
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
    instalarFetch(() => respuestaJson(200, USUARIO_CLIENTE));
    montar();
    await waitFor(() => expect(auth.autenticado).toBe(true));
    act(() => auth.actualizarUsuario({ nombre: 'Juan Nuevo', telefono: '+56 9 1111 2222' }));
    expect(screen.getByTestId('estado').textContent).toBe('usuario:Juan Nuevo');
    expect(auth.usuario.telefono).toBe('+56 9 1111 2222');
    expect(auth.usuario.email).toBe('cliente@ferrefix.cl');
    expect(leerSesion()).toEqual({ accessToken: 'tok', refreshToken: 'r' });
  });

  test('Si otra pestaña cierra la sesión (se borran los tokens) esta pestaña queda anónima', async () => {
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
    instalarFetch(() => respuestaJson(200, USUARIO_CLIENTE));
    montar();
    await waitFor(() => expect(auth.autenticado).toBe(true));
    localStorage.clear();
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'ferrefix_auth_v2', newValue: null }));
    });
    await waitFor(() => expect(screen.getByTestId('estado').textContent).toBe('anonimo'));
  });

  test('Si otra pestaña INICIA sesión (hay tokens y aquí no hay usuario en memoria) esta pestaña carga al usuario con /auth/me', async () => {
    const falso = instalarFetch(() => respuestaJson(200, USUARIO_CLIENTE));
    montar();
    expect(screen.getByTestId('estado').textContent).toBe('anonimo');
    expect(falso).not.toHaveBeenCalled();

    guardarSesion({ accessToken: 'de-otra-pestana', refreshToken: 'r' }); // lo que dejó la otra pestaña
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'ferrefix_auth_v2', newValue: '{}' }));
    });

    await waitFor(() => expect(screen.getByTestId('estado').textContent).toBe('usuario:Juan Maestro'));
    const [l] = llamadasDe(falso);
    expect(l.ruta).toBe('/api/v1/auth/me');
    expect(l.authorization).toBe('Bearer de-otra-pestana');
  });

  test('Si otra pestaña cambia los tokens y aquí YA hay usuario, no se vuelve a consultar /auth/me', async () => {
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
    const falso = instalarFetch(() => respuestaJson(200, USUARIO_CLIENTE));
    montar();
    await waitFor(() => expect(auth.autenticado).toBe(true));
    expect(falso).toHaveBeenCalledTimes(1);
    guardarSesion({ accessToken: 'otro', refreshToken: 'r2' });
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'ferrefix_auth_v2', newValue: '{}' }));
    });
    expect(falso).toHaveBeenCalledTimes(1);
  });

  test('reintentarSesion tras una red caída al abrir: limpia el error, vuelve a consultar y restaura al usuario', async () => {
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
    let conectado = false;
    const falso = instalarFetch(() => (conectado ? respuestaJson(200, USUARIO_CLIENTE) : new TypeError('Failed to fetch')));
    montar();
    await waitFor(() => expect(screen.getByTestId('error').textContent).not.toBe(''));
    expect(screen.getByTestId('estado').textContent).toBe('anonimo');

    conectado = true;
    await act(async () => {
      await auth.reintentarSesion();
    });
    expect(screen.getByTestId('estado').textContent).toBe('usuario:Juan Maestro');
    expect(screen.getByTestId('error').textContent).toBe('');
    expect(falso).toHaveBeenCalledTimes(2);
  });

  test('reintentarSesion con la red todavía caída: vuelve a quedar con el error y conserva los tokens', async () => {
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
    instalarFetch(() => new TypeError('Failed to fetch'));
    montar();
    await waitFor(() => expect(screen.getByTestId('error').textContent).not.toBe(''));
    await act(async () => {
      await auth.reintentarSesion();
    });
    expect(screen.getByTestId('error').textContent).not.toBe('');
    expect(screen.getByTestId('estado').textContent).toBe('anonimo');
    expect(leerSesion()).toEqual({ accessToken: 'tok', refreshToken: 'r' });
  });

  test('useAuth fuera de un AuthProvider lanza un error claro', () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Sonda />)).toThrow();
    espia.mockRestore();
  });
});
