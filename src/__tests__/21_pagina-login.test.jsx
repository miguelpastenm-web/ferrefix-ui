// Test: Página Login/Registro: valida en el cliente, envía a la API, muestra los errores del backend junto a su campo y solo redirige a rutas internas
// Función: Login()

import { describe, test, expect, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import Login from '../pages/Login.jsx';
import { ApiError } from '../api/errores.js';
import { renderConAuth, Ubicacion } from './helpers/renderConAuth.js';
import { USUARIO_CLIENTE, USUARIO_ADMIN } from './helpers/fetchMock.js';

const pagina = (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/registro" element={<Login />} />
    <Route path="*" element={<Ubicacion />} />
  </Routes>
);
const escribir = (etiqueta, valor) => fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
const enviar = (nombreBoton) => fireEvent.click(screen.getByRole('button', { name: nombreBoton }));
const apiError = (status, mensaje, detalles = []) => new ApiError({ status, mensaje, detalles });

describe('Página Login', () => {
  afterEach(() => cleanup());

  test('Login: etiquetas asociadas, autocompletar correcto y sin campos de registro', () => {
    renderConAuth(pagina, { rutaInicial: '/login' });
    expect(screen.getByLabelText(/Correo Electrónico/).getAttribute('autocomplete')).toBe('username');
    expect(screen.getByLabelText(/Contraseña/).getAttribute('autocomplete')).toBe('current-password');
    expect(screen.queryByLabelText(/RUN/)).toBeNull();
    expect(screen.queryByLabelText(/Nombre Completo/)).toBeNull();
  });

  test('Login: con campos inválidos muestra los errores y NO llama a la API', () => {
    const { valor } = renderConAuth(pagina, { rutaInicial: '/login' });
    escribir(/Correo/, 'no-es-email');
    enviar('Entrar a mi Cuenta');
    expect(document.querySelectorAll('.invalid-feedback').length).toBe(2);
    expect(valor.login).not.toHaveBeenCalled();
  });

  test('Login: envía email y contraseña y, si el backend responde, ya no se queda en el formulario', async () => {
    const login = vi.fn().mockResolvedValue(USUARIO_CLIENTE);
    const { valor } = renderConAuth(pagina, { rutaInicial: '/login', login });
    escribir(/Correo/, 'cliente@ferrefix.cl');
    escribir(/Contraseña/, 'cliente123');
    enviar('Entrar a mi Cuenta');
    await waitFor(() => expect(valor.login).toHaveBeenCalledWith({ email: 'cliente@ferrefix.cl', password: 'cliente123' }));
  });

  test('Login: credenciales inválidas (401) muestran el mensaje del backend en una alerta', async () => {
    const login = vi.fn().mockRejectedValue(apiError(401, 'Credenciales inválidas'));
    renderConAuth(pagina, { rutaInicial: '/login', login });
    escribir(/Correo/, 'cliente@ferrefix.cl');
    escribir(/Contraseña/, 'mala');
    enviar('Entrar a mi Cuenta');
    expect((await screen.findByRole('alert')).textContent).toContain('Credenciales inválidas');
    expect(screen.getByRole('button', { name: 'Entrar a mi Cuenta' }).disabled).toBe(false);
  });

  test('Login: sin conexión muestra el mensaje de red del cliente', async () => {
    const login = vi.fn().mockRejectedValue(apiError(0, 'No se pudo conectar con el servidor.'));
    renderConAuth(pagina, { rutaInicial: '/login', login });
    escribir(/Correo/, 'cliente@ferrefix.cl');
    escribir(/Contraseña/, 'x');
    enviar('Entrar a mi Cuenta');
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo conectar');
  });
});

describe('Página Registro', () => {
  afterEach(() => cleanup());

  const llenarValido = () => {
    escribir(/Nombre Completo/, 'Ana Pérez');
    escribir(/RUN/, '12.345.678-5');
    escribir(/Correo/, 'ana@correo.cl');
    escribir(/Contraseña/, 'segura123');
  };

  test('Registro: muestra RUT, pide mínimo 8 caracteres y rechaza una clave de 7 sin llamar a la API', () => {
    const { valor } = renderConAuth(pagina, { rutaInicial: '/registro' });
    expect(screen.getByLabelText(/RUN/)).toBeTruthy();
    expect(screen.getByText('Mínimo 8 caracteres.')).toBeTruthy();
    llenarValido();
    escribir(/Contraseña/, '1234567');
    enviar('Registrarme e Iniciar Sesión');
    expect(screen.getByText(/al menos 8 caracteres/)).toBeTruthy();
    expect(valor.registrar).not.toHaveBeenCalled();
  });

  test('Registro: un RUT con dígito verificador incorrecto se rechaza en el cliente', () => {
    const { valor } = renderConAuth(pagina, { rutaInicial: '/registro' });
    llenarValido();
    escribir(/RUN/, '12.345.678-9');
    enviar('Registrarme e Iniciar Sesión');
    expect(valor.registrar).not.toHaveBeenCalled();
    expect(document.querySelectorAll('.invalid-feedback').length).toBe(1);
  });

  test('Registro: envía rut, nombre, email y clave a la API', async () => {
    const registrar = vi.fn().mockResolvedValue(USUARIO_CLIENTE);
    const { valor } = renderConAuth(pagina, { rutaInicial: '/registro', registrar });
    llenarValido();
    enviar('Registrarme e Iniciar Sesión');
    await waitFor(() => expect(valor.registrar).toHaveBeenCalledWith({
      rut: '12.345.678-5', nombre: 'Ana Pérez', email: 'ana@correo.cl', password: 'segura123'
    }));
  });

  test('Registro: los errores 400 con "details" del backend aparecen junto a su campo', async () => {
    const registrar = vi.fn().mockRejectedValue(apiError(400, 'Datos de entrada inválidos', ['email: El correo debe tener un formato válido', 'password: La contraseña debe tener al menos 8 caracteres']));
    renderConAuth(pagina, { rutaInicial: '/registro', registrar });
    llenarValido();
    enviar('Registrarme e Iniciar Sesión');
    await screen.findByRole('alert');
    const mensajes = [...document.querySelectorAll('.invalid-feedback')].map((n) => n.textContent);
    expect(mensajes).toContain('El correo debe tener un formato válido');
    expect(mensajes).toContain('La contraseña debe tener al menos 8 caracteres');
  });

  test('Registro: un 409 por correo o RUT repetido se asocia al campo correspondiente', async () => {
    const registrar = vi.fn()
      .mockRejectedValueOnce(apiError(409, 'Ya existe un usuario con ese correo'))
      .mockRejectedValueOnce(apiError(409, 'Ya existe un usuario con ese RUT'));
    renderConAuth(pagina, { rutaInicial: '/registro', registrar });
    llenarValido();
    enviar('Registrarme e Iniciar Sesión');
    await waitFor(() => expect(screen.getByText('Ya existe un usuario con ese correo', { selector: '.invalid-feedback' })).toBeTruthy());
    enviar('Registrarme e Iniciar Sesión');
    await waitFor(() => expect(screen.getByText('Ya existe un usuario con ese RUT', { selector: '.invalid-feedback' })).toBeTruthy());
  });
});

describe('Página Login — redirección con sesión y parámetro next', () => {
  afterEach(() => cleanup());
  const ir = (next, usuario = USUARIO_CLIENTE) =>
    renderConAuth(pagina, { rutaInicial: `/login?next=${encodeURIComponent(next)}`, usuario });
  const destino = () => screen.getByTestId('ubicacion').textContent;

  test('Con sesión y next interno: va a esa ruta (conservando query)', () => {
    ir('/carrito?x=1');
    expect(destino()).toBe('/carrito?x=1');
  });

  test('Sin next: CLIENTE va al catálogo y ADMIN al panel', () => {
    renderConAuth(pagina, { rutaInicial: '/login', usuario: USUARIO_CLIENTE });
    expect(destino()).toBe('/catalogo');
    cleanup();
    renderConAuth(pagina, { rutaInicial: '/login', usuario: USUARIO_ADMIN });
    expect(destino()).toBe('/admin');
  });

  test.each([
    ['https://malo.example/robo'],
    ['//malo.example'],
    ['/\\malo.example'],
    ['javascript:alert(1)'],
    ['carrito'],
    ['/login'],
    ['/registro?next=/x']
  ])('next peligroso o inválido (%s) se ignora y se usa el destino por defecto', (next) => {
    ir(next);
    expect(destino()).toBe('/catalogo');
  });

  test('Mientras se verifica la sesión no muestra el formulario ni redirige', () => {
    renderConAuth(pagina, { rutaInicial: '/login', cargando: true });
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByLabelText(/Correo/)).toBeNull();
  });
});
