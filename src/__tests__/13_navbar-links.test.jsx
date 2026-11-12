// Test: Navbar: muestra los enlaces públicos, ofrece login/registro a anónimos, Mi Cuenta y carrito a clientes y solo el panel (sin carrito) a administradores
// Función: Navbar()

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { screen, cleanup, fireEvent } from '@testing-library/react';
import Navbar from '../components/Navbar.jsx';
import { renderConAuth } from './helpers/renderConAuth.js';
import { USUARIO_CLIENTE, USUARIO_ADMIN } from './helpers/fetchMock.js';

describe('Componente Navbar', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  test('Anónimo: enlaces públicos, Iniciar Sesión y Registrarse, y sin panel ni Cerrar Sesión', () => {
    renderConAuth(<Navbar />);
    expect(screen.getByRole('link', { name: 'Catálogo' }).getAttribute('href')).toBe('/catalogo');
    expect(screen.getByRole('link', { name: 'Arriendos' }).getAttribute('href')).toBe('/arriendos');
    expect(screen.getByRole('link', { name: 'Nosotros' }).getAttribute('href')).toBe('/nosotros');
    expect(screen.getByRole('link', { name: 'Cotizaciones' }).getAttribute('href')).toBe('/contacto');
    expect(screen.getByRole('link', { name: 'Iniciar Sesión' }).getAttribute('href')).toBe('/login');
    expect(screen.getByRole('link', { name: 'Registrarse' }).getAttribute('href')).toBe('/registro');
    expect(screen.queryByText('Panel de administración')).toBeNull();
    expect(screen.queryByText('Cerrar Sesión')).toBeNull();
  });

  test('Cliente: ve su nombre, Mi Cuenta, Mi Carrito y Cerrar Sesión (que llama a logout)', () => {
    const { valor } = renderConAuth(<Navbar />, { usuario: USUARIO_CLIENTE });
    expect(screen.getByTitle('Conectado como Juan Maestro')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Mi Cuenta/ }).getAttribute('href')).toBe('/cuenta');
    expect(screen.getByRole('link', { name: /Mi Carrito/ }).getAttribute('href')).toBe('/carrito');
    expect(screen.queryByText('Panel de administración')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Iniciar Sesión' })).toBeNull();
    fireEvent.click(screen.getByText('Cerrar Sesión'));
    expect(valor.logout).toHaveBeenCalledTimes(1);
  });

  test('Admin: ve el panel de administración y NO ve carrito ni Mi Cuenta', () => {
    renderConAuth(<Navbar />, { usuario: USUARIO_ADMIN });
    expect(screen.getByRole('link', { name: /Panel de administración/ }).getAttribute('href')).toBe('/admin');
    expect(screen.queryByTitle('Ver mi carrito de compras')).toBeNull();
    expect(screen.queryByRole('link', { name: /Mi Carrito/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Mi Cuenta/ })).toBeNull();
  });

  test('Mientras se verifica la sesión muestra un indicador y no ofrece Iniciar Sesión', () => {
    renderConAuth(<Navbar />, { cargando: true });
    expect(screen.getByRole('status', { name: 'Verificando sesión' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Iniciar Sesión' })).toBeNull();
  });
});
