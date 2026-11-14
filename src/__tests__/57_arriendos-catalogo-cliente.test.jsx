// Test: Catálogo público de máquinas, flujo de arriendo del cliente (con bloqueo para ADMIN y manejo de 400/409) y pestaña Mis Arriendos en CuentaCliente
// Función: Arriendos(), CuentaCliente(), HistorialArriendos()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import Arriendos from '../pages/Arriendos.jsx';
import CuentaCliente from '../pages/CuentaCliente.jsx';
import { renderConAuth } from './helpers/renderConAuth.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, USUARIO_CLIENTE, USUARIO_ADMIN } from './helpers/fetchMock.js';

const dtoMaquina = (id = 1, extra = {}) => ({
  id,
  codigo: `MAQ-0${id}`,
  nombre: `Martillo Demoledor ${id}`,
  marca: 'Bosch',
  categoria: 'Demolición',
  tarifaDia: 25000,
  estado: 'DISPONIBLE',
  incluye: 'Maleta',
  imagenUrl: `/media/maquinas/m${id}.webp`,
  especificaciones: { Potencia: '1750 W' },
  unidadesTotales: 2,
  unidadesDisponibles: 2,
  ...extra
});

const dtoArriendo = (extra = {}) => ({
  id: 5,
  codigo: 'ARR-000005',
  estado: 'VIGENTE',
  maquina: { id: 1, codigo: 'MAQ-01', nombre: 'Martillo Demoledor 1', marca: 'Bosch', imagenUrl: null },
  unidadCodigo: 'MAQ-01-U01',
  tarifaDia: 25000,
  dias: 3,
  fechaInicio: '2026-11-15',
  fechaFin: '2026-11-17',
  total: 75000,
  telefonoContacto: '+56 9 8765 4321',
  direccionFaena: 'Av. Obra 123',
  regionFaena: 'Región Metropolitana',
  comunaFaena: 'Santiago',
  createdAt: '2026-11-14T12:00:00',
  ...extra
});

describe('Arriendos — catálogo y flujo del cliente', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Carga máquinas desde GET /maquinas, muestra error con Reintentar si falla y distingue disponibilidad', async () => {
    let falla = true;
    instalarFetch(() =>
      falla
        ? errorBackend(500, 'Error interno')
        : respuestaJson(200, [dtoMaquina(1), dtoMaquina(2, { estado: 'NO_DISPONIBLE', unidadesDisponibles: 0 })])
    );

    renderConAuth(<Arriendos />, { rutaInicial: '/arriendos' });
    expect(screen.getByText('Cargando maquinarias…')).toBeTruthy();
    expect(await screen.findByText('No pudimos cargar las maquinarias')).toBeTruthy();

    falla = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    const tarjetas = await screen.findAllByTestId('tarjeta-maquina');
    expect(tarjetas).toHaveLength(2);
    expect(within(tarjetas[0]).getByRole('button', { name: 'Arrendar' }).disabled).toBe(false);
    expect(within(tarjetas[1]).getByRole('button', { name: 'No Disponible' }).disabled).toBe(true);
  });

  test('ADMIN ve aviso y el botón bloqueado para no arrendar', async () => {
    instalarFetch(() => respuestaJson(200, [dtoMaquina(1)]));
    renderConAuth(<Arriendos />, { usuario: USUARIO_ADMIN, rutaInicial: '/arriendos' });

    const aviso = await screen.findByRole('note');
    expect(aviso.textContent).toMatch(/administrador no pueden solicitar arriendos/i);
    const boton = screen.getByRole('button', { name: 'Solo clientes' });
    expect(boton.disabled).toBe(true);
  });

  test('CLIENTE arrienda una máquina contra POST /arriendos, ve el contrato y recarga el catálogo', async () => {
    const falso = instalarFetch((l) => {
      if (l.metodo === 'GET' && l.ruta === '/api/v1/maquinas') return respuestaJson(200, [dtoMaquina(1)]);
      if (l.metodo === 'POST' && l.ruta === '/api/v1/arriendos') return respuestaJson(201, dtoArriendo());
      return errorBackend(404, 'no existe');
    });

    renderConAuth(<Arriendos />, { usuario: USUARIO_CLIENTE, rutaInicial: '/arriendos' });
    fireEvent.click(await screen.findByRole('button', { name: 'Arrendar' }));

    fireEvent.change(screen.getByLabelText(/Teléfono Móvil de Contacto/), { target: { value: '+56 9 8765 4321' } });
    fireEvent.change(screen.getByLabelText(/Dirección Exacta de la Obra/), { target: { value: 'Av. Obra 123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Arriendo' }));

    expect(await screen.findByText('¡Arriendo Registrado Exitosamente!')).toBeTruthy();
    expect(screen.getByText('Código: ARR-000005')).toBeTruthy();
    expect(screen.getByText('$75.000')).toBeTruthy();

    const posts = llamadasDe(falso).filter((l) => l.metodo === 'POST' && l.ruta === '/api/v1/arriendos');
    expect(posts).toHaveLength(1);
    expect(posts[0].cuerpo.maquinaId).toBe(1);
    expect(llamadasDe(falso).filter((l) => l.metodo === 'GET' && l.ruta === '/api/v1/maquinas')).toHaveLength(2);
  });

  test('Muestra error 409 y errores por campo 400 del backend sin reintentar solo', async () => {
    const falso = instalarFetch((l) => {
      if (l.metodo === 'GET') return respuestaJson(200, [dtoMaquina(1)]);
      return errorBackend(409, 'No quedan unidades disponibles', ['direccionFaena: Dirección inválida']);
    });

    renderConAuth(<Arriendos />, { usuario: USUARIO_CLIENTE, rutaInicial: '/arriendos' });
    fireEvent.click(await screen.findByRole('button', { name: 'Arrendar' }));
    fireEvent.change(screen.getByLabelText(/Teléfono Móvil de Contacto/), { target: { value: '+56 9 8765 4321' } });
    fireEvent.change(screen.getByLabelText(/Dirección Exacta de la Obra/), { target: { value: 'Av. Obra 123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Arriendo' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('No quedan unidades disponibles');
    expect(screen.getByText('Dirección inválida')).toBeTruthy();
    expect(llamadasDe(falso).filter((l) => l.metodo === 'POST')).toHaveLength(1);
  });
});

describe('CuentaCliente — pestaña Mis Arriendos', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Pide GET /arriendos/mis-arriendos al abrir la pestaña y muestra los contratos del servidor', async () => {
    const falso = instalarFetch(() => respuestaJson(200, [dtoArriendo(), dtoArriendo({ id: 6, codigo: 'ARR-000006', estado: 'FINALIZADO' })]));
    renderConAuth(<CuentaCliente />, { usuario: USUARIO_CLIENTE, rutaInicial: '/cuenta?tab=arriendos' });

    const tarjetas = await screen.findAllByTestId('tarjeta-arriendo');
    expect(tarjetas).toHaveLength(2);
    expect(tarjetas[0].textContent).toContain('ARR-000005');
    expect(tarjetas[0].textContent).toContain('MAQ-01-U01');
    expect(tarjetas[1].textContent).toContain('Finalizado');
    expect(llamadasDe(falso).map((l) => `${l.metodo} ${l.ruta}`)).toEqual(['GET /api/v1/arriendos/mis-arriendos']);
  });

  test('Si falla GET /arriendos/mis-arriendos muestra ErrorCarga y permite reintentar', async () => {
    let falla = true;
    instalarFetch(() => (falla ? errorBackend(500, 'Error') : respuestaJson(200, [])));
    renderConAuth(<CuentaCliente />, { usuario: USUARIO_CLIENTE, rutaInicial: '/cuenta?tab=arriendos' });

    expect(await screen.findByText('No pudimos cargar tus arriendos')).toBeTruthy();
    falla = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(screen.getByText('No tienes maquinarias arrendadas actualmente')).toBeTruthy());
  });
});
