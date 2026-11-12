// Test: Checkout contra POST /ordenes: envía solo producto y cantidad, muestra la boleta y el envío que devuelve el servidor, no vacía el carrito si falla, maneja el 409 con sus detalles y no reintenta solo ante un fallo de red
// Función: Carrito() (checkout y boleta)

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect, useState } from 'react';
import { render, screen, cleanup, fireEvent, waitFor, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Carrito from '../pages/Carrito.jsx';
import { MENSAJE_COMPRA_SIN_CONFIRMAR, MENSAJE_SESION_EXPIRADA } from '../utils/errorOrden.js';
import { AuthContext } from '../context/authContexto.js';
import { configurarCliente } from '../api/client.js';
import { guardarSesion, leerSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { obtenerComunaPorDefecto } from '../data/chile.js';
import { renderConAuth, valorDeAuth } from './helpers/renderConAuth.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, diferido, USUARIO_CLIENTE } from './helpers/fetchMock.js';
import { dtoProducto, dtoOrden, lineaCarrito, sembrarCarrito, leerCarritoGuardado } from './helpers/fixtures.js';

const P3 = dtoProducto(3, { nombre: 'Esmeril', precioVenta: 30000, stock: 10 });
const P5 = dtoProducto(5, { nombre: 'Brocas', precioVenta: 5000, stock: 10 });
const MSG_STOCK = 'No hay stock suficiente para completar la compra. No se descontó nada';
const MSG_BLOQUEO = 'El recurso está siendo modificado por otra operación. Intente nuevamente';

// Lo que el SERVIDOR calcula: precio unitario distinto del guardado y un envío que el estimador del cliente nunca daría
const ORDEN_SERVIDOR = dtoOrden({
  items: [
    { productoId: 3, sku: P3.sku, nombre: 'Esmeril', precioUnitario: 33000, cantidad: 2, subtotal: 66000 },
    { productoId: 5, sku: P5.sku, nombre: 'Brocas', precioUnitario: 5000, cantidad: 1, subtotal: 5000 }
  ],
  subtotal: 71000, costoEnvio: 3990, total: 74990, metodoPago: 'TARJETA_CREDITO'
});

let catalogo;
let responderOrden;
let responderRefresh;
let falso;
let cambiarUsuario;

const montar = () => renderConAuth(<Carrito />, { usuario: USUARIO_CLIENTE, rutaInicial: '/carrito' });
const posts = () => llamadasDe(falso).filter((l) => l.metodo === 'POST' && l.ruta === '/api/v1/ordenes');
const refrescos = () => llamadasDe(falso).filter((l) => l.ruta === '/api/v1/auth/refresh');

// Como montar(), pero el usuario de la sesión puede cambiar durante la prueba (cambiarUsuario(null) = sesión caída)
function ProveedorMutable({ children }) {
  const [usuario, setUsuario] = useState(USUARIO_CLIENTE);
  useEffect(() => {
    cambiarUsuario = setUsuario; // el test lo usa después de montar (setUsuario es estable)
  }, []);
  return <AuthContext.Provider value={valorDeAuth({ usuario })}>{children}</AuthContext.Provider>;
}
const montarConSesionMutable = () =>
  render(
    <MemoryRouter initialEntries={['/carrito']}>
      <ProveedorMutable>
        <Carrito />
      </ProveedorMutable>
    </MemoryRouter>
  );

async function irAlCheckout(montarVista = montar) {
  const vista = montarVista();
  const pagar = await screen.findByRole('button', { name: /Continuar al Pago/ });
  await waitFor(() => expect(llamadasDe(falso).some((l) => l.metodo === 'GET')).toBe(true));
  await act(async () => {});
  fireEvent.click(pagar);
  await screen.findByRole('heading', { name: 'Paso de Pago y Despacho', level: 2 });
  return vista;
}
const llenarEnvio = () => {
  fireEvent.change(screen.getByLabelText(/Teléfono de Contacto/), { target: { value: '+56987654321' } });
  fireEvent.change(screen.getByLabelText(/Calle, Número y Depto/), { target: { value: 'Av. Siempre Viva 742' } });
};
const confirmar = () => fireEvent.click(screen.getByRole('button', { name: 'Confirmar compra' }));

describe('Checkout — POST /ordenes', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    localStorage.clear();
    borrarSesion();
    sembrarCarrito([lineaCarrito(P3, 2), lineaCarrito(P5, 1)]);
    catalogo = [P3, P5];
    responderOrden = () => respuestaJson(201, ORDEN_SERVIDOR);
    responderRefresh = () => errorBackend(401, 'Refresh token inválido o vencido');
    falso = instalarFetch((l) => {
      if (l.metodo === 'GET') return respuestaJson(200, catalogo);
      if (l.ruta === '/api/v1/auth/refresh') return responderRefresh(l);
      if (l.metodo === 'POST' && l.ruta === '/api/v1/ordenes') return responderOrden(l);
      return errorBackend(404, 'no existe');
    });
  });
  afterEach(() => {
    cleanup();
    configurarCliente({});
    borrarSesion();
    vi.unstubAllGlobals();
  });

  test('El formulario muestra nombre, RUT y correo de la sesión (solo lectura) y ningún dato inventado', async () => {
    await irAlCheckout();
    expect(screen.getByText('Juan Maestro')).toBeTruthy();
    expect(screen.getByText('15432890-4')).toBeTruthy();
    expect(screen.getByText('cliente@ferrefix.cl')).toBeTruthy();
    expect(screen.getByLabelText(/Teléfono de Contacto/).value).toBe('');
    expect(screen.getByLabelText(/Calle, Número y Depto/).value).toBe('');
    expect(document.body.textContent).not.toContain('15.432.890-K');
    expect(document.body.textContent).not.toContain('Av. Providencia 1240');
    expect(document.body.textContent).not.toContain('+56 9 8765 4321');
  });

  test('Compra exitosa: el POST lleva SOLO productoId y cantidad (sin precios), la boleta muestra lo del servidor y el carrito se vacía', async () => {
    await irAlCheckout();
    llenarEnvio();
    fireEvent.click(screen.getByLabelText(/Tarjeta de Crédito/));
    confirmar();

    const boleta = await screen.findByTestId('boleta');
    const [post] = posts();
    expect(post.cuerpo).toEqual({
      items: [{ productoId: 3, cantidad: 2 }, { productoId: 5, cantidad: 1 }],
      metodoPago: 'TARJETA_CREDITO',
      telefono: '+56 9 8765 4321',
      direccionEnvio: 'Av. Siempre Viva 742',
      region: 'Región Metropolitana',
      comuna: obtenerComunaPorDefecto('Región Metropolitana')
    });
    expect(JSON.stringify(post.cuerpo)).not.toMatch(/precio|total|subtotal|costoEnvio/i);

    // Boleta = respuesta del servidor, NO la estimación del carrito (65.000, envío gratis)
    expect(within(boleta).getByText(/ORD-000012/)).toBeTruthy();
    expect(within(boleta).getByText(/BOL-000012/)).toBeTruthy();
    expect(within(boleta).getByText('$71.000')).toBeTruthy();
    expect(within(boleta).getByText('$3.990')).toBeTruthy();
    expect(within(boleta).getByText('$74.990')).toBeTruthy();
    expect(within(boleta).getByText('$33.000')).toBeTruthy();
    expect(within(boleta).queryByText('Gratis')).toBeNull();
    expect(within(boleta).queryByText('$65.000')).toBeNull();
    expect(within(boleta).getByText('12-11-2026 10:30')).toBeTruthy();
    expect(within(boleta).getByText('Pagada', { exact: false })).toBeTruthy();
    expect(within(boleta).getByText('Juan Maestro')).toBeTruthy();
    expect(leerCarritoGuardado()).toEqual([]);
  });

  test('Si el servidor dice envío gratis, la boleta dice Gratis (se muestra lo que viene, no lo que se calcularía)', async () => {
    responderOrden = () => respuestaJson(201, { ...ORDEN_SERVIDOR, subtotal: 71000, costoEnvio: 0, total: 71000 });
    await irAlCheckout();
    llenarEnvio();
    confirmar();
    const boleta = await screen.findByTestId('boleta');
    expect(within(boleta).getByText('Gratis')).toBeTruthy();
    expect(within(boleta).getAllByText('$71.000').length).toBeGreaterThan(0);
  });

  test('Validaciones del formulario: sin teléfono ni dirección no se llama a la API', async () => {
    await irAlCheckout();
    confirmar();
    expect(document.querySelectorAll('.invalid-feedback').length).toBeGreaterThanOrEqual(2);
    expect(posts()).toHaveLength(0);
    fireEvent.change(screen.getByLabelText(/Teléfono de Contacto/), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/Indicaciones/), { target: { value: 'x'.repeat(501) } });
    confirmar();
    expect(screen.getByText(/Teléfono chileno inválido/)).toBeTruthy();
    expect(screen.getByText(/no pueden superar los 500 caracteres/)).toBeTruthy();
    expect(posts()).toHaveLength(0);
  });

  test('409 de stock (formato real): muestra el mensaje y los detalles, NO vacía el carrito, vuelve al carrito, marca la línea y ofrece Ajustar', async () => {
    responderOrden = () => errorBackend(409, MSG_STOCK, [`Esmeril (SKU ${P3.sku}): disponibles 1, solicitaste 2`]);
    await irAlCheckout();
    llenarEnvio();
    catalogo = [dtoProducto(3, { nombre: 'Esmeril', precioVenta: 30000, stock: 1 }), P5]; // lo que verá la re-consulta
    confirmar();

    expect((await screen.findByTestId('mensaje-error-compra')).textContent).toBe(MSG_STOCK);
    expect(screen.getAllByText(`Esmeril (SKU ${P3.sku}): disponibles 1, solicitaste 2`).length).toBeGreaterThan(0);
    expect(leerCarritoGuardado()).toHaveLength(2);
    expect(await screen.findByRole('heading', { name: 'Carrito de Compras', level: 1 })).toBeTruthy(); // volvió al paso del carrito

    await screen.findByText('Solo quedan 1 unidades disponibles.');
    expect(screen.getByRole('button', { name: /Continuar al Pago/ }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar a 1' }));
    expect(leerCarritoGuardado().find((l) => l.productoId === 3).cantidad).toBe(1);
    await waitFor(() => expect(screen.getByRole('button', { name: /Continuar al Pago/ }).disabled).toBe(false));
    expect(posts()).toHaveLength(1); // nada se reintentó solo
  });

  test('404 (producto ya no existe): avisa, no vacía el carrito y deja quitar la línea', async () => {
    responderOrden = () => errorBackend(404, 'Producto no encontrado: [5]');
    await irAlCheckout();
    llenarEnvio();
    catalogo = [P3];
    confirmar();
    expect((await screen.findByTestId('mensaje-error-compra')).textContent).toBe('Producto no encontrado: [5]');
    const linea = await screen.findByTestId('linea-5');
    await waitFor(() => expect(within(linea).getByText('Este producto ya no está disponible en el catálogo.')).toBeTruthy());
    expect(leerCarritoGuardado()).toHaveLength(2);
    fireEvent.click(within(linea).getByRole('button', { name: 'Quitar' }));
    expect(leerCarritoGuardado().map((l) => l.productoId)).toEqual([3]);
  });

  test('400 del backend: el mensaje del campo aparece junto al campo y el carrito se conserva', async () => {
    responderOrden = () => errorBackend(400, 'Datos de entrada inválidos', ['telefono: El teléfono solo admite números, +, espacios, guiones y paréntesis (8 a 20 caracteres)']);
    await irAlCheckout();
    llenarEnvio();
    confirmar();
    expect(await screen.findByText(/El teléfono solo admite números/, { selector: '.invalid-feedback' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Paso de Pago y Despacho', level: 2 })).toBeTruthy();
    expect(leerCarritoGuardado()).toHaveLength(2);
  });

  test('403 (p. ej. sesión sin permiso): muestra el mensaje del servidor y conserva el carrito', async () => {
    responderOrden = () => errorBackend(403, 'No tienes permisos para acceder a este recurso');
    await irAlCheckout();
    llenarEnvio();
    confirmar();
    expect((await screen.findByTestId('mensaje-error-compra')).textContent).toBe('No tienes permisos para acceder a este recurso');
    expect(leerCarritoGuardado()).toHaveLength(2);
  });

  test('Falla de red al confirmar: NO vacía el carrito, NO reintenta solo y avisa que revise Mis compras', async () => {
    responderOrden = () => new TypeError('Failed to fetch');
    await irAlCheckout();
    llenarEnvio();
    confirmar();

    expect((await screen.findByTestId('mensaje-error-compra')).textContent).toBe(MENSAJE_COMPRA_SIN_CONFIRMAR);
    expect(MENSAJE_COMPRA_SIN_CONFIRMAR).toBe('No pudimos confirmar tu compra; revisa Mis compras antes de volver a intentar');
    expect(screen.getByRole('link', { name: 'Revisar Mis compras' }).getAttribute('href')).toBe('/cuenta?tab=compras');
    expect(leerCarritoGuardado()).toHaveLength(2);
    expect(screen.queryByTestId('boleta')).toBeNull();

    await new Promise((r) => setTimeout(r, 60));
    expect(posts()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Confirmar compra' }).disabled).toBe(false); // el reintento es decisión del usuario
  });

  test('Un 5xx también es "no pudimos confirmar" (no se sabe si la orden se creó) y no reintenta solo', async () => {
    responderOrden = () => errorBackend(503, 'Servicio no disponible');
    await irAlCheckout();
    llenarEnvio();
    confirmar();
    expect((await screen.findByTestId('mensaje-error-compra')).textContent).toBe(MENSAJE_COMPRA_SIN_CONFIRMAR);
    expect(leerCarritoGuardado()).toHaveLength(2);
    await new Promise((r) => setTimeout(r, 40));
    expect(posts()).toHaveLength(1);
  });

  test('409 por recurso ocupado: ofrece un botón Reintentar; no reintenta solo y al pulsarlo reenvía y compra', async () => {
    let intento = 0;
    responderOrden = () => {
      intento += 1;
      return intento === 1 ? errorBackend(409, MSG_BLOQUEO) : respuestaJson(201, ORDEN_SERVIDOR);
    };
    await irAlCheckout();
    llenarEnvio();
    confirmar();

    expect((await screen.findByTestId('mensaje-error-compra')).textContent).toBe(MSG_BLOQUEO);
    await new Promise((r) => setTimeout(r, 40));
    expect(posts()).toHaveLength(1);
    expect(leerCarritoGuardado()).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByTestId('boleta')).toBeTruthy();
    expect(posts()).toHaveLength(2);
    expect(leerCarritoGuardado()).toEqual([]);
  });

  test('Doble clic en Confirmar: se envía UNA sola orden', async () => {
    const pendiente = diferido();
    responderOrden = () => pendiente.promesa.then(() => respuestaJson(201, ORDEN_SERVIDOR));
    await irAlCheckout();
    llenarEnvio();
    const boton = screen.getByRole('button', { name: 'Confirmar compra' });
    fireEvent.click(boton);
    fireEvent.click(boton); // mismo botón, segundo clic (ya cambió a "Confirmando…")
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmando…' }).disabled).toBe(true));
    expect(posts()).toHaveLength(1);
    await act(async () => pendiente.resolver());
    expect(await screen.findByTestId('boleta')).toBeTruthy();
    expect(posts()).toHaveLength(1);
  });
  test('401 con el refresh RECHAZADO: carrito conservado, mensaje claro (no el texto crudo del backend) y enlace para iniciar sesión', async () => {
    guardarSesion({ accessToken: 'viejo', refreshToken: 'r' });
    responderOrden = () => errorBackend(401, 'Token ausente, inválido o vencido');
    await irAlCheckout();
    llenarEnvio();
    confirmar();

    expect((await screen.findByTestId('mensaje-error-compra')).textContent).toBe(MENSAJE_SESION_EXPIRADA);
    expect(MENSAJE_SESION_EXPIRADA).toBe('Tu sesión expiró; inicia sesión para terminar tu compra');
    expect(screen.queryByText(/Token ausente/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toBe('/login?next=%2Fcarrito');
    expect(screen.getByRole('heading', { name: 'Carrito de Compras', level: 1 })).toBeTruthy(); // volvió al carrito
    expect(screen.queryByRole('button', { name: 'Confirmar compra' })).toBeNull();
    expect(leerCarritoGuardado()).toHaveLength(2);
    expect(screen.queryByTestId('boleta')).toBeNull();
    // Intentó renovar UNA vez, y no reintentó la orden (el refresh fue rechazado); la sesión local quedó borrada
    expect(refrescos()).toHaveLength(1);
    expect(posts()).toHaveLength(1);
    expect(leerSesion()).toBeNull();
  });

  test('La sesión cae durante el POST (el cliente HTTP avisa a la app): nunca queda una pantalla casi en blanco', async () => {
    guardarSesion({ accessToken: 'viejo', refreshToken: 'r' });
    responderOrden = () => errorBackend(401, 'Token ausente, inválido o vencido');
    await irAlCheckout(montarConSesionMutable);
    configurarCliente({ alSesionInvalida: () => cambiarUsuario(null) }); // lo mismo que hace el AuthProvider
    llenarEnvio();
    confirmar();

    expect((await screen.findByTestId('mensaje-error-compra')).textContent).toBe(MENSAJE_SESION_EXPIRADA);
    expect(screen.getByRole('heading', { name: 'Carrito de Compras', level: 1 })).toBeTruthy();
    expect(screen.getByRole('table')).toBeTruthy(); // los productos siguen a la vista
    expect(screen.getByText('Esmeril')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Inicia sesión para pagar' }).getAttribute('href')).toBe('/login?next=%2Fcarrito');
    expect(screen.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toBe('/login?next=%2Fcarrito');
    expect(screen.queryByRole('heading', { name: 'Paso de Pago y Despacho' })).toBeNull();
    expect(leerCarritoGuardado()).toHaveLength(2);
  });

  test('La sesión se cierra por otro motivo estando en el checkout (p. ej. en otra pestaña): se muestra el carrito con el enlace de login', async () => {
    await irAlCheckout(montarConSesionMutable);
    expect(screen.getByRole('heading', { name: 'Paso de Pago y Despacho', level: 2 })).toBeTruthy();

    act(() => cambiarUsuario(null));

    expect(screen.queryByRole('heading', { name: 'Paso de Pago y Despacho' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirmar compra' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Carrito de Compras', level: 1 })).toBeTruthy();
    expect(screen.getByText('Esmeril')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Inicia sesión para pagar' }).getAttribute('href')).toBe('/login?next=%2Fcarrito');
    expect(leerCarritoGuardado()).toHaveLength(2);
    expect(posts()).toHaveLength(0);
  });

  test('401 pero el refresh falla por RED (no por rechazo): la sesión se conserva y el formulario sigue disponible con el aviso de "no pudimos confirmar"', async () => {
    guardarSesion({ accessToken: 'viejo', refreshToken: 'r' });
    responderOrden = () => errorBackend(401, 'Token ausente, inválido o vencido');
    responderRefresh = () => new TypeError('Failed to fetch');
    await irAlCheckout();
    llenarEnvio();
    confirmar();

    expect((await screen.findByTestId('mensaje-error-compra')).textContent).toBe(MENSAJE_COMPRA_SIN_CONFIRMAR);
    expect(screen.getByRole('button', { name: 'Confirmar compra' })).toBeTruthy();
    expect(leerSesion()).toEqual({ accessToken: 'viejo', refreshToken: 'r' });
    expect(leerCarritoGuardado()).toHaveLength(2);
    await new Promise((r) => setTimeout(r, 40));
    expect(posts()).toHaveLength(1);
  });

  test('401 con el refresh EXITOSO: se reintenta la orden una sola vez con el token nuevo y la compra se concreta', async () => {
    guardarSesion({ accessToken: 'viejo', refreshToken: 'r' });
    responderRefresh = () => respuestaJson(200, { accessToken: 'nuevo', refreshToken: 'r2', tokenType: 'Bearer', expiresIn: 900, usuario: USUARIO_CLIENTE });
    responderOrden = (l) => (l.authorization === 'Bearer nuevo' ? respuestaJson(201, ORDEN_SERVIDOR) : errorBackend(401, 'Token ausente, inválido o vencido'));
    await irAlCheckout();
    llenarEnvio();
    confirmar();

    expect(await screen.findByTestId('boleta')).toBeTruthy();
    expect(posts().map((l) => l.authorization)).toEqual(['Bearer viejo', 'Bearer nuevo']);
    expect(refrescos()).toHaveLength(1);
    expect(leerCarritoGuardado()).toEqual([]);
  });
});
