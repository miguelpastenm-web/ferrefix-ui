// Test: Login contra el backend: el contexto envía las credenciales a /auth/login, guarda solo los tokens y expone el usuario con sus roles; credenciales malas no inician sesión
// Función: AuthProvider.login()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext.jsx';
import { useAuth } from '../context/authContexto.js';
import { leerSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, tokensDe, USUARIO_CLIENTE, USUARIO_ADMIN } from './helpers/fetchMock.js';

let auth;
function Sonda() {
  const valor = useAuth();
  useEffect(() => {
    auth = valor; // sin lista de dependencias: tras cada render los tests ven el valor actual
  });
  return null;
}
const montar = () => render(<AuthProvider><Sonda /></AuthProvider>);

describe('Login de usuarios', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Login: credenciales correctas de cliente y de admin devuelven su usuario con rol, guardan los tokens y las incorrectas lanzan 401 sin iniciar sesión', async () => {
    const falso = instalarFetch((l) => {
      const { email, password } = l.cuerpo;
      if (email === 'admin@ferrefix.cl' && password === 'admin123') return respuestaJson(200, tokensDe(USUARIO_ADMIN, 'a-admin', 'r-admin'));
      if (email === 'cliente@ferrefix.cl' && password === 'cliente123') return respuestaJson(200, tokensDe(USUARIO_CLIENTE, 'a-cli', 'r-cli'));
      return errorBackend(401, 'Credenciales inválidas');
    });
    montar();

    let usuario;
    await act(async () => {
      usuario = await auth.login({ email: 'cliente@ferrefix.cl', password: 'cliente123' });
    });
    expect(usuario.roles).toEqual(['CLIENTE']);
    expect(auth.esCliente).toBe(true);
    expect(leerSesion()).toEqual({ accessToken: 'a-cli', refreshToken: 'r-cli' });

    act(() => auth.logout());
    await act(async () => {
      usuario = await auth.login({ email: 'admin@ferrefix.cl', password: 'admin123' });
    });
    expect(usuario.roles).toEqual(['ADMIN']);
    expect(auth.esAdmin).toBe(true);

    act(() => auth.logout());
    let error;
    await act(async () => {
      error = await auth.login({ email: 'admin@ferrefix.cl', password: 'incorrecta' }).catch((e) => e);
    });
    expect(error.status).toBe(401);
    expect(auth.autenticado).toBe(false);
    expect(leerSesion()).toBeNull();
    expect(llamadasDe(falso).every((l) => l.ruta === '/api/v1/auth/login')).toBe(true);
  });
});
