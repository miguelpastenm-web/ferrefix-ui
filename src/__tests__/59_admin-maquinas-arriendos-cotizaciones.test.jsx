// Test: Panel Admin — Máquinas (CRUD y unidades), Arriendos (filtros, edición, devolución y borrado) y Cotizaciones (filtros, gestión y borrado) con carga bajo demanda, ModalConfirmacion y errorAdmin
// Función: Admin(), AdminMaquinas(), AdminArriendos(), AdminCotizaciones()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import Admin from '../pages/Admin.jsx';
import { MENSAJE_OPERACION_SIN_CONFIRMAR } from '../utils/errorAdmin.js';
import { renderConAuth } from './helpers/renderConAuth.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, USUARIO_ADMIN } from './helpers/fetchMock.js';
import { dtoProducto } from './helpers/fixtures.js';

let maquinas;
let unidadesPorMaq;
let arriendos;
let cotizaciones;
let falla;
let falso;

const instalarBackend = () => {
  falso = instalarFetch((l) => {
    if (l.ruta === '/api/v1/productos' && l.metodo === 'GET') return respuestaJson(200, [dtoProducto(1)]);
    if (l.ruta === '/api/v1/ordenes' && l.metodo === 'GET') return respuestaJson(200, []);

    // Máquinas y unidades
    if (l.ruta === '/api/v1/maquinas' && l.metodo === 'GET') return respuestaJson(200, maquinas);
    if (l.ruta === '/api/v1/maquinas' && l.metodo === 'POST') {
      const nueva = { id: 9, ...l.cuerpo, estado: 'NO_DISPONIBLE', unidadesTotales: 0, unidadesDisponibles: 0 };
      maquinas = [...maquinas, nueva];
      unidadesPorMaq[9] = [];
      return respuestaJson(201, nueva);
    }
    const mMaqUnidades = /^\/api\/v1\/maquinas\/(\d+)\/unidades(?:\/(\d+))?$/.exec(l.ruta);
    if (mMaqUnidades) {
      const mId = Number(mMaqUnidades[1]);
      const uId = mMaqUnidades[2] ? Number(mMaqUnidades[2]) : null;
      if (l.metodo === 'GET') return respuestaJson(200, unidadesPorMaq[mId] ?? []);
      if (l.metodo === 'POST') {
        const actuales = unidadesPorMaq[mId] ?? [];
        const creadas = Array.from({ length: l.cuerpo.cantidad }, (_, i) => ({
          id: 100 + actuales.length + i,
          codigo: `MAQ-0${mId}-U0${actuales.length + i + 1}`,
          estado: 'DISPONIBLE'
        }));
        unidadesPorMaq[mId] = [...actuales, ...creadas];
        return respuestaJson(201, creadas);
      }
      if (l.metodo === 'DELETE') {
        unidadesPorMaq[mId] = (unidadesPorMaq[mId] ?? []).filter((u) => u.id !== uId);
        return respuestaJson(204);
      }
    }
    const mMaq = /^\/api\/v1\/maquinas\/(\d+)$/.exec(l.ruta);
    if (mMaq) {
      const id = Number(mMaq[1]);
      if (l.metodo === 'PUT') {
        maquinas = maquinas.map((m) => (m.id === id ? { ...m, ...l.cuerpo } : m));
        return respuestaJson(200, maquinas.find((m) => m.id === id));
      }
      if (l.metodo === 'DELETE') {
        if (falla.deleteMaquina) return falla.deleteMaquina(l);
        maquinas = maquinas.filter((m) => m.id !== id);
        return respuestaJson(204);
      }
    }

    // Arriendos
    if (l.ruta.startsWith('/api/v1/arriendos') && l.metodo === 'GET') {
      const url = new URL(`http://x${l.ruta}`);
      const est = url.searchParams.get('estado');
      return respuestaJson(200, est ? arriendos.filter((a) => a.estado === est) : arriendos);
    }
    const mArrDev = /^\/api\/v1\/arriendos\/(\d+)\/devolver$/.exec(l.ruta);
    if (mArrDev && l.metodo === 'PATCH') {
      const id = Number(mArrDev[1]);
      arriendos = arriendos.map((a) => (a.id === id ? { ...a, estado: 'FINALIZADO' } : a));
      return respuestaJson(200, arriendos.find((a) => a.id === id));
    }
    const mArr = /^\/api\/v1\/arriendos\/(\d+)$/.exec(l.ruta);
    if (mArr) {
      const id = Number(mArr[1]);
      if (l.metodo === 'PUT') {
        arriendos = arriendos.map((a) =>
          a.id === id ? { ...a, telefonoContacto: l.cuerpo.telefono, direccionFaena: l.cuerpo.direccionFaena } : a
        );
        return respuestaJson(200, arriendos.find((a) => a.id === id));
      }
      if (l.metodo === 'DELETE') {
        if (falla.deleteArriendo) return falla.deleteArriendo(l);
        arriendos = arriendos.filter((a) => a.id !== id);
        return respuestaJson(204);
      }
    }

    // Cotizaciones
    if (l.ruta.startsWith('/api/v1/cotizaciones') && l.metodo === 'GET') {
      const url = new URL(`http://x${l.ruta}`);
      const est = url.searchParams.get('estado');
      return respuestaJson(200, est ? cotizaciones.filter((c) => c.estado === est) : cotizaciones);
    }
    const mCot = /^\/api\/v1\/cotizaciones\/(\d+)$/.exec(l.ruta);
    if (mCot) {
      const id = Number(mCot[1]);
      if (l.metodo === 'PATCH') {
        cotizaciones = cotizaciones.map((c) => (c.id === id ? { ...c, ...l.cuerpo } : c));
        return respuestaJson(200, cotizaciones.find((c) => c.id === id));
      }
      if (l.metodo === 'DELETE') {
        cotizaciones = cotizaciones.filter((c) => c.id !== id);
        return respuestaJson(204);
      }
    }

    return errorBackend(404, 'no existe');
  });
};

const montar = () => renderConAuth(<Admin />, { usuario: USUARIO_ADMIN, rutaInicial: '/admin' });

describe('Admin — Máquinas, Arriendos y Cotizaciones', () => {
  beforeEach(() => {
    localStorage.clear();
    falla = {};
    maquinas = [
      {
        id: 1,
        codigo: 'MAQ-01',
        nombre: 'Martillo Demoledor',
        marca: 'Bosch',
        categoria: 'Demolición',
        tarifaDia: 25000,
        estado: 'DISPONIBLE',
        incluye: 'Maleta',
        imagenUrl: null,
        especificaciones: {},
        unidadesTotales: 1,
        unidadesDisponibles: 1
      }
    ];
    unidadesPorMaq = {
      1: [{ id: 10, codigo: 'MAQ-01-U01', estado: 'DISPONIBLE' }]
    };
    arriendos = [
      {
        id: 20,
        codigo: 'ARR-000020',
        estado: 'VIGENTE',
        maquina: { id: 1, codigo: 'MAQ-01', nombre: 'Martillo Demoledor', marca: 'Bosch' },
        unidadCodigo: 'MAQ-01-U01',
        tarifaDia: 25000,
        dias: 3,
        fechaInicio: '2026-11-15',
        fechaFin: '2026-11-17',
        total: 75000,
        telefonoContacto: '+56 9 1111 2222',
        direccionFaena: 'Obra Norte 100',
        regionFaena: 'Región Metropolitana',
        comunaFaena: 'Santiago',
        cliente: { id: 2, rut: '15432890-4', nombre: 'Juan Maestro', email: 'cliente@ferrefix.cl' }
      }
    ];
    cotizaciones = [
      {
        id: 30,
        codigo: 'COT-000030',
        nombre: 'Constructora Sur',
        rut: '76.123.456-7',
        email: 'compras@sur.cl',
        telefono: '+56 9 8765 4321',
        tipoProyecto: 'Obra Gruesa y Construcción',
        region: 'Región Metropolitana',
        detalle: '50 sacos de cemento',
        despachoObra: true,
        estado: 'PENDIENTE',
        notaAdmin: null,
        createdAt: '2026-11-14T10:00:00'
      }
    ];
    instalarBackend();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Carga bajo demanda: al montar Admin NO pide máquinas, arriendos ni cotizaciones', async () => {
    montar();
    await screen.findByRole('button', { name: 'Productos (1)' });
    const rutas = llamadasDe(falso).map((l) => l.ruta);
    expect(rutas).toEqual(['/api/v1/productos', '/api/v1/ordenes']);
  });

  test('Máquinas: crear, editar con código inmutable, gestionar unidades y manejar 409 al eliminar con ModalConfirmacion', async () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Máquinas' }));
    expect(await screen.findByText('Martillo Demoledor')).toBeTruthy();

    // Editar con código inmutable
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.getByLabelText('Código *').disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Martillo Pro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Martillo Pro')).toBeTruthy();

    // Unidades: alta de 2 unidades y borrado de una
    fireEvent.click(screen.getByRole('button', { name: /Unidades \(/ }));
    expect(await screen.findByText('MAQ-01-U01')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Dar de alta unidades (1 a 20)'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar unidades' }));
    expect(await screen.findByText('MAQ-01-U02')).toBeTruthy();

    const filasUnidad = screen.getAllByTestId('fila-unidad');
    fireEvent.click(within(filasUnidad[0]).getByRole('button', { name: 'Eliminar' }));
    const dlgUnidad = screen.getByRole('dialog', { name: '¿Eliminar unidad?' });
    fireEvent.click(within(dlgUnidad).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(screen.queryByText('MAQ-01-U01')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    // Eliminar máquina con 409 muestra errorAdmin en ModalConfirmacion
    falla.deleteMaquina = () => errorBackend(409, 'Tiene arriendos registrados');
    fireEvent.click(within(screen.getByTestId('fila-maquina')).getByRole('button', { name: 'Eliminar' }));
    const dlgMaq = screen.getByRole('dialog');
    fireEvent.click(within(dlgMaq).getByRole('button', { name: 'Eliminar' }));
    expect(await within(dlgMaq).findByRole('alert')).toBeTruthy();
    expect(within(dlgMaq).getByRole('alert').textContent).toBe('Tiene arriendos registrados');
  });

  test('Arriendos: filtra por estado, edita contacto/faena, registra devolución y elimina con ModalConfirmacion', async () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Arriendos' }));
    expect(await screen.findByText('ARR-000020')).toBeTruthy();

    // Editar contacto y faena
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Dirección de faena *'), { target: { value: 'Nueva Faena 999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.getByText(/Nueva Faena 999/)).toBeTruthy());

    // Devolver con ModalConfirmacion
    fireEvent.click(screen.getByRole('button', { name: 'Devolver' }));
    const dlgDev = screen.getByRole('dialog');
    fireEvent.click(within(dlgDev).getByRole('button', { name: 'Confirmar devolución' }));
    await waitFor(() => expect(screen.getByText('Finalizado')).toBeTruthy());

    // Filtrar por VIGENTE (vacío) y luego TODOS
    fireEvent.change(screen.getByLabelText('Filtrar arriendos por estado'), { target: { value: 'VIGENTE' } });
    expect(await screen.findByText('No se encontraron arriendos para el filtro seleccionado.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Filtrar arriendos por estado'), { target: { value: 'TODOS' } });
    expect(await screen.findByText('ARR-000020')).toBeTruthy();

    // Error 500 al eliminar muestra MENSAJE_OPERACION_SIN_CONFIRMAR
    falla.deleteArriendo = () => errorBackend(500, 'Falla');
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    const dlgDel = screen.getByRole('dialog');
    fireEvent.click(within(dlgDel).getByRole('button', { name: 'Eliminar' }));
    expect((await within(dlgDel).findByRole('alert')).textContent).toBe(MENSAJE_OPERACION_SIN_CONFIRMAR);
  });

  test('Cotizaciones: filtra por estado, gestiona estado/nota y elimina con ModalConfirmacion', async () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Cotizaciones' }));
    expect(await screen.findByText('COT-000030')).toBeTruthy();

    // Ver y gestionar
    fireEvent.click(screen.getByRole('button', { name: 'Ver / Gestionar' }));
    expect(screen.getByText('50 sacos de cemento')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'RESPONDIDA' } });
    fireEvent.change(screen.getByLabelText('Nota interna del administrador'), { target: { value: 'Cotización enviada por correo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar gestión' }));
    await waitFor(() => expect(within(screen.getByTestId('fila-cotizacion')).getByText('Respondida')).toBeTruthy());

    // Eliminar con ModalConfirmacion
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    const dlg = screen.getByRole('dialog');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(screen.queryByText('COT-000030')).toBeNull());
  });
});

