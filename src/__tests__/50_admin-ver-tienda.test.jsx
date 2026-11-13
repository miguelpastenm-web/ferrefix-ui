// Test: Barra del Admin: tiene el enlace "Ver tienda" que lleva a la portada ("/"), con el mismo estilo de botón que "Salir" y sin quitar el correo ni "Salir"
// Función: Admin()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import Admin from '../pages/Admin.jsx';
import { renderConAuth } from './helpers/renderConAuth.js';
import { instalarFetch, respuestaJson, USUARIO_ADMIN } from './helpers/fetchMock.js';

describe('Admin — enlace "Ver tienda"', () => {
  beforeEach(() => {
    localStorage.clear();
    instalarFetch(() => respuestaJson(200, []));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('existe como enlace y apunta a "/"', () => {
    renderConAuth(<Admin />, { usuario: USUARIO_ADMIN, rutaInicial: '/admin' });
    const enlace = screen.getByRole('link', { name: 'Ver tienda' });
    expect(enlace.getAttribute('href')).toBe('/');
  });

  test('comparte el estilo de botón de "Salir" y convive con el correo y "Salir"', () => {
    renderConAuth(<Admin />, { usuario: USUARIO_ADMIN, rutaInicial: '/admin' });
    const enlace = screen.getByRole('link', { name: 'Ver tienda' });
    const salir = screen.getByRole('button', { name: 'Salir' });
    expect(enlace.className).toBe(salir.className);
    expect(screen.getByText('admin@ferrefix.cl')).toBeTruthy();
  });
});
