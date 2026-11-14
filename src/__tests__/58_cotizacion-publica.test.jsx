// Test: Formulario público de cotización: envío anónimo o autenticado a POST /cotizaciones, acuse con código del servidor, errores 400 por campo y sin localStorage
// Función: ContactoCotizacion()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import ContactoCotizacion from '../pages/ContactoCotizacion.jsx';
import { guardarSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { renderConAuth } from './helpers/renderConAuth.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, USUARIO_CLIENTE } from './helpers/fetchMock.js';

const llenarFormulario = () => {
  fireEvent.change(screen.getByPlaceholderText('Ej: Constructora Andina o Juan Pérez'), {
    target: { value: 'Constructora Norte Ltda.' }
  });
  fireEvent.change(screen.getByPlaceholderText('Ej: 76.123.456-7'), {
    target: { value: '15.432.890-4' }
  });
  fireEvent.change(screen.getByPlaceholderText('adquisiciones@empresa.cl'), {
    target: { value: 'compras@norte.cl' }
  });
  fireEvent.change(screen.getByPlaceholderText('+56 9 9876 5432'), {
    target: { value: '+56 9 8765 4321' }
  });
  fireEvent.change(screen.getByPlaceholderText(/Detalla qué artículos/), {
    target: { value: 'Necesitamos 100 sacos de cemento y 40 placas OSB de 15mm.' }
  });
};

describe('ContactoCotizacion — POST /api/v1/cotizaciones', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Visitante anónimo envía cotización sin Authorization, recibe acuse con código y no guarda en localStorage', async () => {
    const falso = instalarFetch(() =>
      respuestaJson(201, { id: 10, codigo: 'COT-000010', estado: 'PENDIENTE', createdAt: '2026-11-14T12:00:00' })
    );
    renderConAuth(<ContactoCotizacion />, { rutaInicial: '/cotizaciones' });

    llenarFormulario();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Solicitud de Cotización' }));

    const acuse = await screen.findByRole('status');
    expect(acuse.textContent).toContain('COT-000010');

    const [l] = llamadasDe(falso);
    expect(l.metodo).toBe('POST');
    expect(l.ruta).toBe('/api/v1/cotizaciones');
    expect(l.authorization).toBeUndefined();
    expect(localStorage.getItem('ferrefix_cotizaciones_v1')).toBeNull();
  });

  test('Cliente autenticado precarga sus datos y envía Bearer token', async () => {
    guardarSesion({ accessToken: 'tok-cli', refreshToken: 'r' });
    const falso = instalarFetch(() =>
      respuestaJson(201, { id: 11, codigo: 'COT-000011', estado: 'PENDIENTE', createdAt: '2026-11-14T12:00:00' })
    );
    renderConAuth(<ContactoCotizacion />, { usuario: USUARIO_CLIENTE, rutaInicial: '/cotizaciones' });

    fireEvent.change(screen.getByPlaceholderText('+56 9 9876 5432'), {
      target: { value: '+56 9 8765 4321' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Detalla qué artículos/), {
      target: { value: 'Cotización de 30 taladros percutores para obra.' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Solicitud de Cotización' }));

    await screen.findByRole('status');
    expect(llamadasDe(falso)[0].authorization).toBe('Bearer tok-cli');
  });

  test('Errores 400 del backend se muestran por campo y en la alerta sin perder el detalle', async () => {
    instalarFetch(() => errorBackend(400, 'Datos de entrada inválidos', ['rut: El RUT no es válido en el servidor']));
    renderConAuth(<ContactoCotizacion />, { rutaInicial: '/cotizaciones' });

    llenarFormulario();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Solicitud de Cotización' }));

    expect(await screen.findByText('Datos de entrada inválidos')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('El RUT no es válido en el servidor')).toBeTruthy());
  });
});
