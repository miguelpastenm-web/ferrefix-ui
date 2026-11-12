// Test: RutaProtegida: sin sesión manda a /login conservando la ruta pedida, bloquea por rol y espera a verificar la sesión antes de decidir
// Función: RutaProtegida()

import { describe, test, expect, afterEach } from 'vitest';
import { screen, cleanup, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import RutaProtegida from '../components/RutaProtegida.jsx';
import EsperarSesion from '../components/EsperarSesion.jsx';
import { ApiError, MENSAJE_SIN_CONEXION } from '../api/errores.js';
import { renderConAuth, Ubicacion } from './helpers/renderConAuth.js';
import { USUARIO_CLIENTE, USUARIO_ADMIN } from './helpers/fetchMock.js';

const rutas = (roles) => (
  <Routes>
    <Route path="/admin" element={<RutaProtegida roles={roles}><p>PANEL SECRETO</p></RutaProtegida>} />
    <Route path="/secreta" element={<RutaProtegida><p>SOLO LOGUEADOS</p></RutaProtegida>} />
    <Route path="*" element={<Ubicacion />} />
  </Routes>
);

describe('RutaProtegida', () => {
  afterEach(() => cleanup());

  test('Anónimo: redirige a /login con la ruta pedida (y su query) codificada en next', () => {
    renderConAuth(rutas(['ADMIN']), { rutaInicial: '/admin?tab=ordenes' });
    expect(screen.queryByText('PANEL SECRETO')).toBeNull();
    expect(screen.getByTestId('ubicacion').textContent).toBe(`/login?next=${encodeURIComponent('/admin?tab=ordenes')}`);
  });

  test('Cargando: muestra el indicador y NO redirige ni muestra el contenido', () => {
    renderConAuth(rutas(['ADMIN']), { rutaInicial: '/admin', cargando: true });
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByText('PANEL SECRETO')).toBeNull();
    expect(screen.queryByTestId('ubicacion')).toBeNull();
  });

  test('ADMIN en ruta de ADMIN: ve el contenido', () => {
    renderConAuth(rutas(['ADMIN']), { rutaInicial: '/admin', usuario: USUARIO_ADMIN });
    expect(screen.getByText('PANEL SECRETO')).toBeTruthy();
  });

  test('CLIENTE en ruta de ADMIN: no ve el contenido y va a la portada', () => {
    renderConAuth(rutas(['ADMIN']), { rutaInicial: '/admin', usuario: USUARIO_CLIENTE });
    expect(screen.queryByText('PANEL SECRETO')).toBeNull();
    expect(screen.getByTestId('ubicacion').textContent).toBe('/');
  });

  test('ADMIN en ruta de CLIENTE: es redirigido a /admin', () => {
    renderConAuth(
      <Routes>
        <Route path="/cuenta" element={<RutaProtegida roles={['CLIENTE']}><p>MI CUENTA</p></RutaProtegida>} />
        <Route path="*" element={<Ubicacion />} />
      </Routes>,
      { rutaInicial: '/cuenta', usuario: USUARIO_ADMIN }
    );
    expect(screen.queryByText('MI CUENTA')).toBeNull();
    expect(screen.getByTestId('ubicacion').textContent).toBe('/admin');
  });

  test('Sin roles requeridos basta con estar autenticado; anónimo igual va a /login', () => {
    renderConAuth(rutas(), { rutaInicial: '/secreta', usuario: USUARIO_CLIENTE });
    expect(screen.getByText('SOLO LOGUEADOS')).toBeTruthy();
    cleanup();
    renderConAuth(rutas(), { rutaInicial: '/secreta' });
    expect(screen.getByTestId('ubicacion').textContent).toBe('/login?next=%2Fsecreta');
  });

  test('Sin conexión al verificar la sesión guardada: NO redirige a /login; muestra el error y un botón Reintentar que llama a reintentarSesion', () => {
    const errorArranque = new ApiError({ status: 0, mensaje: MENSAJE_SIN_CONEXION });
    const { valor } = renderConAuth(rutas(['ADMIN']), { rutaInicial: '/admin', errorArranque });
    expect(screen.queryByTestId('ubicacion')).toBeNull();
    expect(screen.queryByText('PANEL SECRETO')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain(MENSAJE_SIN_CONEXION);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(valor.reintentarSesion).toHaveBeenCalledTimes(1);
  });

  test('EsperarSesion: con errorArranque y sin usuario muestra el mismo error con Reintentar; con usuario o sin error muestra el contenido', () => {
    const errorArranque = new ApiError({ status: 503, mensaje: 'Error del servidor' });
    renderConAuth(<EsperarSesion><p>CONTENIDO</p></EsperarSesion>, { errorArranque });
    expect(screen.queryByText('CONTENIDO')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    cleanup();
    renderConAuth(<EsperarSesion><p>CONTENIDO</p></EsperarSesion>);
    expect(screen.getByText('CONTENIDO')).toBeTruthy();
    cleanup();
    renderConAuth(<EsperarSesion><p>CONTENIDO</p></EsperarSesion>, { usuario: USUARIO_CLIENTE, errorArranque });
    expect(screen.getByText('CONTENIDO')).toBeTruthy();
  });
});
