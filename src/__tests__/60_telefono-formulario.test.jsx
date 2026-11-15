// Test: Campo teléfono: borrado libre sin vaciar valores parciales de golpe, límite por cantidad de dígitos, validación solo móvil (9 + 8 dígitos) y envío normalizado en formularios reales
// Funciones: filtrarEntradaTelefono(), normalizarTelefonoCampo(), formatearTelefono(), validadores.telefono(), ContactoCotizacion(), Arriendos()

import { describe, test, expect, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import ContactoCotizacion from '../pages/ContactoCotizacion.jsx';
import Arriendos from '../pages/Arriendos.jsx';
import {
  filtrarEntradaTelefono,
  formatearTelefono,
  normalizarTelefonoCampo,
  validadores
} from '../data/validaciones.js';
import { renderConAuth } from './helpers/renderConAuth.js';
import { USUARIO_CLIENTE } from './helpers/fetchMock.js';
import * as apiCotizaciones from '../api/cotizaciones.js';
import * as apiMaquinas from '../api/maquinas.js';
import * as apiArriendos from '../api/arriendos.js';

const MAQUINA_DEMO = {
  id: 1,
  codigo: 'MAQ-01',
  nombre: 'Martillo Demoledor 1',
  marca: 'Bosch',
  categoria: 'Demolición',
  tarifaDia: 25000,
  estado: 'DISPONIBLE',
  incluye: 'Maleta',
  imagenUrl: '/media/maquinas/m1.webp',
  especificaciones: { Potencia: '1750 W' },
  unidadesTotales: 2,
  unidadesDisponibles: 2
};

describe('Utilidades de entrada y normalización de teléfono', () => {
  test('formatearTelefono conserva prefijo parcial sin vaciar de golpe ni generar "+56 56"', () => {
    expect(formatearTelefono('')).toBe('');
    expect(formatearTelefono('+56 ')).toBe('+56');
    expect(formatearTelefono('+56')).toBe('+56');
    expect(formatearTelefono('56')).toBe('56');
    expect(formatearTelefono('912345678')).toBe('+56 9 1234 5678');
    expect(formatearTelefono('+56912345678')).toBe('+56 9 1234 5678');
  });

  test('filtrarEntradaTelefono limita por cantidad de dígitos (9 sin 56, 11 con 56) y conserva espacios', () => {
    expect(filtrarEntradaTelefono('+56 9 1234 5678 ')).toBe('+56 9 1234 5678 ');
    expect(filtrarEntradaTelefono('+56 9 1234 56789')).toBe('+56 9 1234 5678');
    expect(filtrarEntradaTelefono('91234567899')).toBe('912345678');
    expect(filtrarEntradaTelefono('569123456789')).toBe('56912345678');
    expect(filtrarEntradaTelefono('+56 ')).toBe('+56 ');
    expect(filtrarEntradaTelefono('')).toBe('');
    expect(filtrarEntradaTelefono('abc+56 9 1234-5678xyz')).toBe('+56 9 1234-5678');
  });

  test('normalizarTelefonoCampo conserva vacío, mantiene valores parciales y normaliza números válidos', () => {
    expect(normalizarTelefonoCampo('')).toBe('');
    expect(normalizarTelefonoCampo('   ')).toBe('');
    expect(normalizarTelefonoCampo('+56 ')).toBe('+56');
    expect(normalizarTelefonoCampo('987654321')).toBe('+56 9 8765 4321');
    expect(normalizarTelefonoCampo('+56 9 8765 4321 ')).toBe('+56 9 8765 4321');
  });

  test('validadores.telefono solo acepta móvil chileno de 9 dígitos que empieza con 9 y rechaza 7 dígitos y fijos', () => {
    expect(validadores.telefono('')).toBe('El teléfono es obligatorio.');
    expect(validadores.telefono('7687687')).toBe('Teléfono chileno inválido (ej: +56 9 1234 5678).');
    expect(validadores.telefono('212345678')).toBe('Teléfono chileno inválido (ej: +56 9 1234 5678).');
    expect(validadores.telefono('+56 2 1234 5678')).toBe('Teléfono chileno inválido (ej: +56 9 1234 5678).');
    expect(validadores.telefono('+56 9 1234 5678')).toBe('');
    expect(validadores.telefono('912345678')).toBe('');
  });
});

describe('Campo de teléfono en formulario (ContactoCotizacion)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test('Permite borrar carácter por carácter hasta vaciar y no vacía de golpe valores parciales en onBlur', () => {
    renderConAuth(<ContactoCotizacion />, {
      usuario: { ...USUARIO_CLIENTE, telefono: '+56 9 1234 5678' }
    });
    const input = screen.getByPlaceholderText('+56 9 9876 5432');
    expect(input.value).toBe('+56 9 1234 5678');

    const pasos = [
      '+56 9 1234 567',
      '+56 9 ',
      '+56 9',
      '+56 ',
      '+56',
      '+5',
      '+',
      ''
    ];
    for (const valor of pasos) {
      fireEvent.change(input, { target: { value: valor } });
      expect(input.value).toBe(valor);
    }

    fireEvent.blur(input);
    expect(input.value).toBe('');

    // Valor parcial en onBlur no se vacía de golpe y muestra error de largo/formato
    fireEvent.change(input, { target: { value: '+56 ' } });
    fireEvent.blur(input);
    expect(input.value).toBe('+56');
    expect(screen.getByText('Teléfono chileno inválido (ej: +56 9 1234 5678).')).toBeTruthy();
  });

  test('Normaliza en onBlur al pegar número con espacios o sin +56 y al escribir desde cero', () => {
    renderConAuth(<ContactoCotizacion />);
    const input = screen.getByPlaceholderText('+56 9 9876 5432');

    fireEvent.change(input, { target: { value: '912345678' } });
    expect(input.value).toBe('912345678');
    fireEvent.blur(input);
    expect(input.value).toBe('+56 9 1234 5678');

    fireEvent.change(input, { target: { value: '+56 9 8765 4321 ' } });
    expect(input.value).toBe('+56 9 8765 4321 ');
    fireEvent.blur(input);
    expect(input.value).toBe('+56 9 8765 4321');
  });

  test('Al enviar sin haber salido del campo (sin onBlur), normaliza y envía el formato estándar al backend', async () => {
    const spyCrear = vi.spyOn(apiCotizaciones, 'crearCotizacion').mockResolvedValue({
      codigo: 'COT-2026-0099'
    });

    renderConAuth(<ContactoCotizacion />, {
      usuario: { ...USUARIO_CLIENTE, telefono: '' }
    });

    const inputTel = screen.getByPlaceholderText('+56 9 9876 5432');
    fireEvent.change(inputTel, { target: { value: '987654321' } });
    fireEvent.change(
      screen.getByPlaceholderText(/Detalla qué artículos/i),
      { target: { value: 'Necesito 10 sacos de cemento y 2 palas.' } }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enviar Solicitud de Cotización' }));

    await waitFor(() => expect(spyCrear).toHaveBeenCalledTimes(1));
    expect(spyCrear.mock.calls[0][0].telefono).toBe('+56 9 8765 4321');
  });
});

describe('Campo de teléfono en modal de arriendo (Arriendos)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  async function abrirModalArriendo() {
    vi.spyOn(apiMaquinas, 'listarMaquinas').mockResolvedValue([MAQUINA_DEMO]);
    renderConAuth(<Arriendos />, {
      usuario: { ...USUARIO_CLIENTE, telefono: '', direccion: 'Av. Providencia 1240' }
    });
    const botonArrendar = await screen.findByRole('button', { name: 'Arrendar' });
    fireEvent.click(botonArrendar);
    const inputTel = await screen.findByLabelText(/Teléfono Móvil de Contacto/i);
    const inputDir = screen.getByLabelText(/Dirección Exacta de la Obra/i);
    fireEvent.change(inputDir, { target: { value: 'Pasaje Los Aromos 740' } });
    return { inputTel };
  }

  test('Rechaza 7 dígitos ("7687687") y fijo ("212345678") sin llamar al backend', async () => {
    const spyArriendo = vi.spyOn(apiArriendos, 'crearArriendo').mockResolvedValue({});
    const { inputTel } = await abrirModalArriendo();
    const botonConfirmar = screen.getByRole('button', { name: 'Confirmar Arriendo' });

    fireEvent.change(inputTel, { target: { value: '7687687' } });
    fireEvent.click(botonConfirmar);
    expect(screen.getByText('Teléfono chileno inválido (ej: +56 9 1234 5678).')).toBeTruthy();
    expect(spyArriendo).not.toHaveBeenCalled();

    fireEvent.change(inputTel, { target: { value: '212345678' } });
    fireEvent.click(botonConfirmar);
    expect(screen.getByText('Teléfono chileno inválido (ej: +56 9 1234 5678).')).toBeTruthy();
    expect(spyArriendo).not.toHaveBeenCalled();
  });

  test('Acepta "+56 9 1234 5678" y "912345678" normalizándolos al mismo formato al confirmar', async () => {
    const spyArriendo = vi.spyOn(apiArriendos, 'crearArriendo').mockResolvedValue({
      codigo: 'ARR-000100',
      maquinaNombre: 'Martillo Demoledor 1',
      unidadCodigo: 'MAQ-01-U01',
      fechaInicio: '2026-11-15',
      fechaFin: '2026-11-17',
      dias: 3,
      tarifaDia: 25000,
      total: 75000,
      telefonoContacto: '+56 9 1234 5678',
      direccionFaena: 'Pasaje Los Aromos 740',
      regionFaena: 'Región Metropolitana',
      comunaFaena: 'Santiago'
    });

    const { inputTel } = await abrirModalArriendo();
    fireEvent.change(inputTel, { target: { value: '912345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Arriendo' }));

    await waitFor(() => expect(spyArriendo).toHaveBeenCalledTimes(1));
    expect(spyArriendo.mock.calls[0][0].telefono).toBe('+56 9 1234 5678');

    // Cerrar comprobante y volver a abrir para probar con "+56 9 1234 5678"
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    const botonArrendar = await screen.findByRole('button', { name: 'Arrendar' });
    fireEvent.click(botonArrendar);
    const inputTel2 = await screen.findByLabelText(/Teléfono Móvil de Contacto/i);
    fireEvent.change(screen.getByLabelText(/Dirección Exacta de la Obra/i), {
      target: { value: 'Pasaje Los Aromos 740' }
    });
    fireEvent.change(inputTel2, { target: { value: '+56 9 1234 5678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Arriendo' }));

    await waitFor(() => expect(spyArriendo).toHaveBeenCalledTimes(2));
    expect(spyArriendo.mock.calls[1][0].telefono).toBe('+56 9 1234 5678');
  });
});
