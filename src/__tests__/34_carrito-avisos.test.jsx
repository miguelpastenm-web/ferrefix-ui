// Test: Carrito con avisos: concilia con GET /productos (una sola llamada), avisa sin romperse si un producto ya no existe, está agotado o excede el stock, bloquea la compra hasta resolver, y un cambio de precio avisa sin bloquear
// Función: Carrito()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import Carrito from '../pages/Carrito.jsx';
import { TEXTO_ENVIO_GRATIS } from '../utils/envio.js';
import { renderConAuth } from './helpers/renderConAuth.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, USUARIO_CLIENTE, USUARIO_ADMIN } from './helpers/fetchMock.js';
import { dtoProducto, lineaCarrito, sembrarCarrito, leerCarritoGuardado } from './helpers/fixtures.js';

const BOTON_PAGAR = /Continuar al Pago/;
const montar = (opciones = {}) => renderConAuth(<Carrito />, { usuario: USUARIO_CLIENTE, rutaInicial: '/carrito', ...opciones });

describe('Carrito — avisos de disponibilidad', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Carrito vacío: mensaje de vacío y NO consulta el catálogo', async () => {
    const falso = instalarFetch(() => respuestaJson(200, []));
    montar();
    expect(screen.getByText('Tu carrito está actualmente vacío')).toBeTruthy();
    await new Promise((r) => setTimeout(r, 20));
    expect(falso).not.toHaveBeenCalled();
  });

  test('Concilia con UNA sola llamada GET /productos aunque haya varias líneas', async () => {
    sembrarCarrito([lineaCarrito(dtoProducto(1), 1), lineaCarrito(dtoProducto(2), 1), lineaCarrito(dtoProducto(3), 1)]);
    const falso = instalarFetch(() => respuestaJson(200, [dtoProducto(1), dtoProducto(2), dtoProducto(3)]));
    montar();
    await waitFor(() => expect(falso).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(llamadasDe(falso).map((l) => l.ruta)).toEqual(['/api/v1/productos']);
    expect(screen.getByRole('button', { name: BOTON_PAGAR }).disabled).toBe(false);
  });

  test('Producto que ya no existe (ausente del catálogo): avisa, bloquea el pago y "Quitar" lo resuelve', async () => {
    sembrarCarrito([lineaCarrito(dtoProducto(3), 1), lineaCarrito(dtoProducto(99), 1)]);
    instalarFetch(() => respuestaJson(200, [dtoProducto(3)]));
    montar();
    const linea = await screen.findByTestId('linea-99');
    await waitFor(() => expect(within(linea).getByText('Este producto ya no está disponible en el catálogo.')).toBeTruthy());
    expect(screen.getByRole('button', { name: BOTON_PAGAR }).disabled).toBe(true);
    expect(within(screen.getByTestId('linea-3')).queryByRole('alert')).toBeNull();

    fireEvent.click(within(linea).getByRole('button', { name: 'Quitar' }));
    expect(leerCarritoGuardado().map((l) => l.productoId)).toEqual([3]);
    await waitFor(() => expect(screen.getByRole('button', { name: BOTON_PAGAR }).disabled).toBe(false));
  });

  test('Producto agotado (estado AGOTADO): avisa y bloquea hasta quitarlo', async () => {
    sembrarCarrito([lineaCarrito(dtoProducto(3), 1)]);
    instalarFetch(() => respuestaJson(200, [dtoProducto(3, { estado: 'AGOTADO', stock: 0 })]));
    montar();
    await screen.findByText('Este producto está agotado.');
    expect(screen.getByRole('button', { name: BOTON_PAGAR }).disabled).toBe(true);
    fireEvent.click(within(screen.getByTestId('linea-3')).getByRole('button', { name: 'Quitar' }));
    expect(leerCarritoGuardado()).toEqual([]);
  });

  test('Cantidad mayor al stock: avisa cuánto queda y "Ajustar a N" corrige la cantidad y desbloquea', async () => {
    sembrarCarrito([lineaCarrito(dtoProducto(3, { stock: 10 }), 5)]);
    instalarFetch(() => respuestaJson(200, [dtoProducto(3, { stock: 3 })]));
    montar();
    await screen.findByText('Solo quedan 3 unidades disponibles.');
    expect(screen.getByRole('button', { name: BOTON_PAGAR }).disabled).toBe(true);
    expect(leerCarritoGuardado()[0]).toMatchObject({ cantidad: 5, stock: 3 }); // no se tocó la cantidad sola

    fireEvent.click(screen.getByRole('button', { name: 'Ajustar a 3' }));
    expect(leerCarritoGuardado()[0].cantidad).toBe(3);
    await waitFor(() => expect(screen.queryByText(/Solo quedan/)).toBeNull());
    expect(screen.getByRole('button', { name: BOTON_PAGAR }).disabled).toBe(false);
  });

  test('Cambio de precio: actualiza el precio guardado, avisa con el antes y el después y NO bloquea', async () => {
    sembrarCarrito([lineaCarrito(dtoProducto(3, { precioVenta: 30000 }), 2)]);
    instalarFetch(() => respuestaJson(200, [dtoProducto(3, { precioVenta: 35000 })]));
    montar();
    expect(await screen.findByText('Actualizamos algunos precios:')).toBeTruthy();
    expect(screen.getByText(/de \$30\.000 a \$35\.000/)).toBeTruthy();
    expect(leerCarritoGuardado()[0].precioVenta).toBe(35000);
    expect(screen.getByRole('button', { name: BOTON_PAGAR }).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso de precios' }));
    expect(screen.queryByText('Actualizamos algunos precios:')).toBeNull();
  });

  test('Si no se puede consultar el catálogo avisa con Reintentar, no bloquea (el servidor valida al comprar) y no se rompe', async () => {
    sembrarCarrito([lineaCarrito(dtoProducto(3), 1)]);
    let falla = true;
    const falso = instalarFetch(() => (falla ? errorBackend(500, 'Error interno') : respuestaJson(200, [dtoProducto(3)])));
    montar();
    expect(await screen.findByText(/No pudimos verificar la disponibilidad actual/)).toBeTruthy();
    expect(screen.getByRole('button', { name: BOTON_PAGAR }).disabled).toBe(false);
    falla = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.queryByText(/No pudimos verificar la disponibilidad actual/)).toBeNull());
    expect(falso).toHaveBeenCalledTimes(2);
  });

  test('Anónimo: ve el carrito pero para pagar se le pide iniciar sesión, volviendo a /carrito', async () => {
    sembrarCarrito([lineaCarrito(dtoProducto(3), 1)]);
    instalarFetch(() => respuestaJson(200, [dtoProducto(3)]));
    montar({ usuario: null });
    expect(await screen.findByText('Producto 3')).toBeTruthy();
    const enlace = screen.getByRole('link', { name: 'Inicia sesión para pagar' });
    expect(enlace.getAttribute('href')).toBe('/login?next=%2Fcarrito');
    expect(screen.queryByRole('button', { name: BOTON_PAGAR })).toBeNull();
  });

  test('ADMIN: ve un aviso de que no compra y no tiene botón de pago', async () => {
    sembrarCarrito([lineaCarrito(dtoProducto(3), 1)]);
    instalarFetch(() => respuestaJson(200, [dtoProducto(3)]));
    montar({ usuario: USUARIO_ADMIN });
    expect(await screen.findByText(/no realizan compras/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: BOTON_PAGAR })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Inicia sesión para pagar' })).toBeNull();
  });

  test('Los montos son estimados y el texto de envío gratis no menciona la Región Metropolitana', async () => {
    sembrarCarrito([lineaCarrito(dtoProducto(3, { precioVenta: 20000 }), 2)]);
    instalarFetch(() => respuestaJson(200, [dtoProducto(3, { precioVenta: 20000 })]));
    montar();
    await screen.findByText('Producto 3');
    expect(screen.getByText(TEXTO_ENVIO_GRATIS)).toBeTruthy();
    expect(screen.getByText('Despacho estimado:')).toBeTruthy();
    expect(screen.getByText('Total estimado:')).toBeTruthy();
    expect(screen.getByText(/Valores estimados/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Región Metropolitana/);
    expect(screen.getByText('$43.990')).toBeTruthy(); // 40.000 + 3.990 (el subtotal no supera $50.000)
  });
});
