// Test: Panel Admin hasta E7: avisa de que sus productos y órdenes son datos locales (no conectados a la API) y sigue funcionando sin llamar al backend
// Función: Admin()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import Admin from '../pages/Admin.jsx';
import { renderConAuth } from './helpers/renderConAuth.js';
import { instalarFetch, respuestaJson, USUARIO_ADMIN } from './helpers/fetchMock.js';

describe('Panel Admin — aviso de datos locales', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Muestra el aviso visible, el panel sigue operativo y no hace llamadas a la API', () => {
    const falso = instalarFetch(() => respuestaJson(200, []));
    renderConAuth(<Admin />, { usuario: USUARIO_ADMIN, rutaInicial: '/admin' });
    const aviso = screen.getByRole('note');
    expect(aviso.textContent).toMatch(/Datos locales de demostración/);
    expect(aviso.textContent).toMatch(/no están\s+conectados a la API/);
    expect(aviso.textContent).toMatch(/E7/);
    expect(screen.getByRole('button', { name: 'Salir' })).toBeTruthy();
    expect(falso).not.toHaveBeenCalled();
  });
});
