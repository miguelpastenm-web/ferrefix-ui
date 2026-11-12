// Test: Registro contra el backend: el contexto envía rut, nombre, email y clave a /auth/register y deja la sesión iniciada; un correo repetido (409) no inicia sesión
// Función: AuthProvider.registrar()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext.jsx';
import { useAuth } from '../context/authContexto.js';
import { leerSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, tokensDe, USUARIO_CLIENTE } from './helpers/fetchMock.js';

let auth;
function Sonda() {
  const valor = useAuth();
  useEffect(() => {
    auth = valor; // sin lista de dependencias: tras cada render los tests ven el valor actual
  });
  return null;
}
const montar = () => render(<AuthProvider><Sonda /></AuthProvider>);

describe('Registro de clientes', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Registro: un cliente nuevo queda con sesión y rol CLIENTE, y un correo ya registrado (409) no inicia sesión', async () => {
    const nuevo = { ...USUARIO_CLIENTE, id: 9, nombre: 'Ana Pérez', email: 'ana@correo.cl' };
    const falso = instalarFetch((l) =>
      l.cuerpo.email === 'cliente@ferrefix.cl'
        ? errorBackend(409, 'Ya existe un usuario con ese correo')
        : respuestaJson(201, tokensDe(nuevo, 'a-nuevo', 'r-nuevo'))
    );
    montar();

    let usuario;
    await act(async () => {
      usuario = await auth.registrar({ rut: '12.345.678-5', nombre: 'Ana Pérez', email: 'ana@correo.cl', password: 'segura123' });
    });
    expect(usuario.email).toBe('ana@correo.cl');
    expect(auth.esCliente).toBe(true);
    expect(leerSesion()).toEqual({ accessToken: 'a-nuevo', refreshToken: 'r-nuevo' });
    expect(llamadasDe(falso)[0].cuerpo).toEqual({ rut: '12.345.678-5', nombre: 'Ana Pérez', email: 'ana@correo.cl', password: 'segura123' });

    act(() => auth.logout());
    let error;
    await act(async () => {
      error = await auth.registrar({ rut: '15.432.890-4', nombre: 'Otra', email: 'cliente@ferrefix.cl', password: 'segura123' }).catch((e) => e);
    });
    expect(error.status).toBe(409);
    expect(auth.autenticado).toBe(false);
    expect(leerSesion()).toBeNull();
  });
});
