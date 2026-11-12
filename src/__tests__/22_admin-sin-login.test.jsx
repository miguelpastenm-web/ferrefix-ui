// Test: Panel Admin: ya no tiene login interno; el acceso lo decide la ruta protegida por rol y "Salir" cierra la sesión del contexto
// Función: Admin(), RutaProtegida()

import { describe, test, expect, afterEach, beforeEach } from 'vitest';
import { screen, cleanup, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import Admin from '../pages/Admin.jsx';
import RutaProtegida from '../components/RutaProtegida.jsx';
import { renderConAuth, Ubicacion } from './helpers/renderConAuth.js';
import { USUARIO_CLIENTE, USUARIO_ADMIN } from './helpers/fetchMock.js';

const conRuta = (
  <Routes>
    <Route path="/admin" element={<RutaProtegida roles={['ADMIN']}><Admin /></RutaProtegida>} />
    <Route path="*" element={<Ubicacion />} />
  </Routes>
);

describe('Panel Admin sin login interno', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  test('Anónimo en /admin: va a /login?next=/admin y el panel no se monta', () => {
    renderConAuth(conRuta, { rutaInicial: '/admin' });
    expect(screen.getByTestId('ubicacion').textContent).toBe('/login?next=%2Fadmin');
    expect(screen.queryByText('Salir')).toBeNull();
  });

  test('CLIENTE en /admin: no ve el panel y es devuelto a la portada', () => {
    renderConAuth(conRuta, { rutaInicial: '/admin', usuario: USUARIO_CLIENTE });
    expect(screen.queryByText('Salir')).toBeNull();
    expect(screen.getByTestId('ubicacion').textContent).toBe('/');
  });

  test('ADMIN en /admin: ve el panel directo (sin formulario de login) con su correo y puede salir', () => {
    const { valor } = renderConAuth(conRuta, { rutaInicial: '/admin', usuario: USUARIO_ADMIN });
    expect(screen.getByText('admin@ferrefix.cl')).toBeTruthy();
    expect(document.querySelector('input[type="password"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(valor.logout).toHaveBeenCalledTimes(1);
  });
});
