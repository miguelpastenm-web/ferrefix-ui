// Test: Mi Cuenta: precarga los datos del usuario de la sesión y guarda el perfil en el backend (PUT /users/me) actualizando el contexto
// Función: CuentaCliente(), actualizarPerfil()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import CuentaCliente from '../pages/CuentaCliente.jsx';
import { guardarSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { renderConAuth } from './helpers/renderConAuth.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, USUARIO_CLIENTE } from './helpers/fetchMock.js';

const USUARIO = { ...USUARIO_CLIENTE, telefono: '+56 9 1234 5678', direccion: 'Av. Siempre Viva 742', region: 'Región Metropolitana', comuna: 'Providencia' };

const abrirEdicion = () => fireEvent.click(screen.getByRole('button', { name: /Modificar/ }));

describe('Mi Cuenta — perfil', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Precarga los datos del usuario; RUT de solo lectura y correo deshabilitado', () => {
    renderConAuth(<CuentaCliente />, { rutaInicial: '/cuenta', usuario: USUARIO });
    abrirEdicion();
    expect(screen.getByLabelText(/Nombre Completo/).value).toBe('Juan Maestro');
    expect(screen.getByLabelText(/RUN/).value).toBe('15432890-4');
    expect(screen.getByLabelText(/Correo Electrónico/).value).toBe('cliente@ferrefix.cl');
    expect(screen.getByLabelText(/Teléfono/).value).toBe('+56 9 1234 5678');
    expect(screen.getByLabelText(/Dirección de Entrega/).value).toBe('Av. Siempre Viva 742');
    expect(screen.getByLabelText(/Región/).value).toBe('Región Metropolitana');
    expect(screen.getByLabelText(/Comuna/).value).toBe('Providencia');
    expect(screen.getByLabelText(/RUN/).readOnly).toBe(true);
    expect(screen.getByLabelText(/Correo Electrónico/).disabled).toBe(true);
  });

  test('Guardar: PUT /users/me con los 5 campos editables y actualiza el usuario en el contexto con la respuesta', async () => {
    const falso = instalarFetch(() => respuestaJson(200, { ...USUARIO, nombre: 'Juan Nuevo' }));
    const { valor } = renderConAuth(<CuentaCliente />, { rutaInicial: '/cuenta', usuario: USUARIO });
    abrirEdicion();
    fireEvent.change(screen.getByLabelText(/Nombre Completo/), { target: { value: 'Juan Nuevo' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Datos de Despacho/ }));

    await waitFor(() => expect(valor.actualizarUsuario).toHaveBeenCalledTimes(1));
    expect(valor.actualizarUsuario.mock.calls[0][0].nombre).toBe('Juan Nuevo');
    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('PUT');
    expect(l.ruta).toBe('/api/v1/users/me');
    expect(Object.keys(l.cuerpo).sort()).toEqual(['comuna', 'direccion', 'nombre', 'region', 'telefono']);
    expect(l.cuerpo.nombre).toBe('Juan Nuevo');
  });

  test('Datos inválidos (teléfono, dirección vacía): muestra los errores y NO llama a la API', () => {
    const falso = instalarFetch(() => respuestaJson(200, USUARIO));
    renderConAuth(<CuentaCliente />, { rutaInicial: '/cuenta', usuario: USUARIO });
    abrirEdicion();
    fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/Dirección de Entrega/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Datos de Despacho/ }));
    expect(document.querySelectorAll('.invalid-feedback').length).toBe(2);
    expect(falso).not.toHaveBeenCalled();
  });

  test('Error 400 del backend: el mensaje aparece junto al campo y el contexto NO se actualiza', async () => {
    instalarFetch(() => errorBackend(400, 'Datos de entrada inválidos', ['telefono: Teléfono chileno inválido (ej: +56 9 1234 5678).']));
    const { valor } = renderConAuth(<CuentaCliente />, { rutaInicial: '/cuenta', usuario: USUARIO });
    abrirEdicion();
    fireEvent.click(screen.getByRole('button', { name: /Guardar Datos de Despacho/ }));
    await waitFor(() => expect(document.querySelector('.invalid-feedback')).not.toBeNull());
    expect(document.querySelector('.invalid-feedback').textContent).toContain('Teléfono chileno inválido');
    expect(valor.actualizarUsuario).not.toHaveBeenCalled();
  });
});
