// Test: CRUD de productos en el panel Admin contra la API: alta, edición, stock rápido y borrado con confirmación, recarga de la lista tras cada cambio, errores sin reintentos automáticos y sesión vencida
// Función: Admin() (pestañas Dashboard y Productos)

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect, useState } from 'react';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Admin from '../pages/Admin.jsx';
import RutaProtegida from '../components/RutaProtegida.jsx';
import { AuthContext } from '../context/authContexto.js';
import { configurarCliente } from '../api/client.js';
import { guardarSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { MENSAJE_OPERACION_SIN_CONFIRMAR } from '../utils/errorAdmin.js';
import { renderConAuth, valorDeAuth, Ubicacion } from './helpers/renderConAuth.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, USUARIO_ADMIN } from './helpers/fetchMock.js';
import { dtoProducto } from './helpers/fixtures.js';

// Backend falso en memoria: lista, detalle, alta, edición y borrado
let productos;
let siguienteId;
let falla; // { post, put, delete }: funciones que devuelven una respuesta de error
let falso;

const instalarBackend = () => {
  falso = instalarFetch((l) => {
    const m = /^\/api\/v1\/productos(?:\/(\d+))?$/.exec(l.ruta);
    if (!m) return errorBackend(404, 'no existe');
    const id = m[1] ? Number(m[1]) : null;
    if (l.metodo === 'GET' && id === null) return respuestaJson(200, productos);
    if (l.metodo === 'GET') {
      const p = productos.find((x) => x.id === id);
      return p ? respuestaJson(200, p) : errorBackend(404, `Producto no encontrado: ${id}`);
    }
    if (l.metodo === 'POST') {
      if (falla.post) return falla.post(l);
      const nuevo = dtoProducto(siguienteId++, { ...l.cuerpo });
      productos = [...productos, nuevo];
      return respuestaJson(201, nuevo);
    }
    if (l.metodo === 'PUT') {
      if (falla.put) return falla.put(l);
      productos = productos.map((x) => (x.id === id ? { ...x, ...l.cuerpo } : x));
      return respuestaJson(200, productos.find((x) => x.id === id));
    }
    if (l.metodo === 'DELETE') {
      if (falla.delete) return falla.delete(l);
      productos = productos.filter((x) => x.id !== id);
      return respuestaJson(204);
    }
    return errorBackend(405, 'no permitido');
  });
};

const montar = () => renderConAuth(<Admin />, { usuario: USUARIO_ADMIN, rutaInicial: '/admin' });
const llamadas = (metodo, patron) => llamadasDe(falso).filter((l) => l.metodo === metodo && patron.test(l.ruta));
const irAProductos = async () => {
  await screen.findByRole('button', { name: /^Productos \(/ });
  fireEvent.click(screen.getByRole('button', { name: /^Productos \(/ }));
};

describe('Admin — CRUD de productos', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
    productos = [
      dtoProducto(1, { sku: 'TAL-001', nombre: 'Taladro Percutor', marca: 'Bosch', stock: 10, precioVenta: 90000, especificaciones: { Potencia: '800 W' }, imagenOfertaUrl: '/media/ofertas/o1.webp' }),
      dtoProducto(2, { sku: 'CEM-002', nombre: 'Cemento Extra', marca: 'Melón', categoria: 'Construcción', stock: 3, precioVenta: 5000 })
    ];
    siguienteId = 10;
    falla = {};
    instalarBackend();
  });
  afterEach(() => {
    cleanup();
    configurarCliente({});
    borrarSesion();
    vi.unstubAllGlobals();
  });

  test('Alta: el formulario crea el producto en la API, recarga la lista, avisa y el producto aparece en la tabla', async () => {
    montar();
    await irAProductos();
    fireEvent.click(screen.getAllByRole('button', { name: '+ Agregar Producto' })[0]);
    fireEvent.change(screen.getByLabelText(/SKU/), { target: { value: 'ESM-003' } });
    fireEvent.change(screen.getByLabelText(/Nombre del Producto/), { target: { value: 'Esmeril Angular' } });
    fireEvent.change(screen.getByLabelText(/Marca/), { target: { value: 'Makita' } });
    fireEvent.change(screen.getByLabelText(/Precio Unitario/), { target: { value: '45000' } });
    fireEvent.change(screen.getByLabelText(/Stock Disponible/), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Producto' }));

    expect(await screen.findByText('Esmeril Angular')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/Producto "Esmeril Angular" registrado con éxito/);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(llamadas('POST', /productos$/)).toHaveLength(1);
    expect(llamadas('GET', /productos$/)).toHaveLength(2); // carga inicial + recarga tras guardar
    expect(screen.getByRole('button', { name: 'Productos (3)' })).toBeTruthy();
  });

  test('Edición: bloquea el SKU, guarda con PUT conservando especificaciones e imagen de oferta y recarga la lista', async () => {
    montar();
    await irAProductos();
    fireEvent.click(screen.getByRole('button', { name: 'Editar Taladro Percutor' }));
    expect(screen.getByLabelText(/SKU/).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Nombre del Producto/), { target: { value: 'Taladro Percutor 20V' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

    expect(await screen.findByText('Taladro Percutor 20V')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/actualizado/);
    const [put] = llamadas('PUT', /productos\/1$/);
    expect(put.cuerpo.especificaciones).toEqual({ Potencia: '800 W' });
    expect(put.cuerpo.imagenOfertaUrl).toBe('/media/ofertas/o1.webp');
    expect(put.cuerpo.sku).toBe('TAL-001');
    expect(llamadas('GET', /productos$/)).toHaveLength(2);
  });

  test('Stock rápido desde la fila: valida, relee el producto, hace el PUT completo con el stock nuevo y recarga', async () => {
    montar();
    await irAProductos();
    fireEvent.click(screen.getByRole('button', { name: 'Editar stock de Taladro Percutor' }));
    const entrada = screen.getByLabelText(/Stock disponible/);
    expect(entrada.value).toBe('10');

    fireEvent.change(entrada, { target: { value: '-4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar stock' }));
    expect(screen.getByText('El stock no puede ser negativo')).toBeTruthy();
    expect(llamadas('PUT', /productos/)).toHaveLength(0);

    fireEvent.change(entrada, { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar stock' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Stock de "Taladro Percutor" actualizado a 25 unidades/));
    const [put] = llamadas('PUT', /productos\/1$/);
    expect(put.cuerpo).toMatchObject({ stock: 25, sku: 'TAL-001', especificaciones: { Potencia: '800 W' }, imagenOfertaUrl: '/media/ofertas/o1.webp' });
    expect(await screen.findByText('25 unids')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Editar stock' })).toBeNull();
  });

  test('Stock a 0 deja el producto AGOTADO en la lista (el estado lo calcula el servidor)', async () => {
    montar();
    await irAProductos();
    fireEvent.click(screen.getByRole('button', { name: 'Editar stock de Taladro Percutor' }));
    fireEvent.change(screen.getByLabelText(/Stock disponible/), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar stock' }));
    await waitFor(() => expect(llamadas('PUT', /productos\/1$/)).toHaveLength(1));
    expect(llamadas('PUT', /productos\/1$/)[0].cuerpo.stock).toBe(0);
  });

  test('Eliminar pide confirmación explícita: cancelar no borra; confirmar hace el DELETE, recarga y avisa', async () => {
    montar();
    await irAProductos();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Cemento Extra' }));
    const dialogo = screen.getByRole('dialog', { name: '¿Eliminar producto?' });
    expect(within(dialogo).getByText(/Cemento Extra/)).toBeTruthy();
    expect(within(dialogo).getByText(/Las órdenes ya hechas conservan su nombre, SKU y precio/)).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(llamadas('DELETE', /productos/)).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Cemento Extra' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(screen.queryByText('Cemento Extra')).toBeNull());
    expect(llamadas('DELETE', /productos\/2$/)).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toMatch(/Producto "Cemento Extra" eliminado del catálogo/);
    expect(screen.getByRole('button', { name: 'Productos (1)' })).toBeTruthy();
  });

  test('Eliminar un producto que ya no existe (404): el error se ve en el diálogo y la lista se refresca', async () => {
    montar();
    await irAProductos();
    productos = productos.filter((p) => p.id !== 2); // otra persona lo borró antes
    falla.delete = () => errorBackend(404, 'Producto no encontrado: 2');
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Cemento Extra' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Producto no encontrado: 2');
    await waitFor(() => expect(screen.queryByTestId('fila-producto', { exact: false }) && screen.getAllByTestId('fila-producto')).toHaveLength(1));
    expect(llamadas('GET', /productos$/)).toHaveLength(2);
  });

  test('Eliminar con la red caída: avisa que no se pudo confirmar, refresca la lista y NO reintenta sola', async () => {
    montar();
    await irAProductos();
    falla.delete = () => new TypeError('Failed to fetch');
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Cemento Extra' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    expect((await within(screen.getByRole('dialog')).findByRole('alert')).textContent).toBe(MENSAJE_OPERACION_SIN_CONFIRMAR);
    await new Promise((r) => setTimeout(r, 40));
    expect(llamadas('DELETE', /productos/)).toHaveLength(1);
    expect(llamadas('GET', /productos$/)).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Eliminar' }).disabled).toBe(false); // reintentar es decisión del usuario
  });

  test('Dashboard: "Ir a Inventario Completo" abre Productos con el filtro de stock crítico activo y editar stock funciona desde ahí', async () => {
    montar();
    await screen.findByTestId('kpi-productos');
    expect(screen.getByTestId('kpi-critico').textContent).toBe('1'); // Cemento Extra (3 unids)
    fireEvent.click(screen.getByRole('button', { name: /Ir a Inventario Completo/ }));
    expect(screen.getByRole('button', { name: /Mostrando críticos y agotados/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByTestId('fila-producto')).toHaveLength(1);
    expect(screen.getByText('Cemento Extra')).toBeTruthy();
  });

  test('Sesión vencida durante una acción (401 y refresh rechazado): el panel manda a /login?next=/admin', async () => {
    guardarSesion({ accessToken: 'viejo', refreshToken: 'r' });
    let cambiarUsuario;
    function ProveedorMutable({ children }) {
      const [usuario, setUsuario] = useState(USUARIO_ADMIN);
      useEffect(() => {
        cambiarUsuario = setUsuario;
      }, []);
      return <AuthContext.Provider value={valorDeAuth({ usuario })}>{children}</AuthContext.Provider>;
    }
    falla.delete = () => errorBackend(401, 'Token ausente, inválido o vencido');
    falso = instalarFetch((l) => {
      if (l.ruta === '/api/v1/auth/refresh') return errorBackend(401, 'Refresh token inválido o vencido');
      if (l.metodo === 'DELETE') return falla.delete(l);
      return respuestaJson(200, productos);
    });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ProveedorMutable>
          <Routes>
            <Route path="/admin" element={<RutaProtegida roles={['ADMIN']}><Admin /></RutaProtegida>} />
            <Route path="*" element={<Ubicacion />} />
          </Routes>
        </ProveedorMutable>
      </MemoryRouter>
    );
    await irAProductos();
    configurarCliente({ alSesionInvalida: () => cambiarUsuario(null) }); // lo que hace el AuthProvider
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Cemento Extra' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(screen.getByTestId('ubicacion').textContent).toBe('/login?next=%2Fadmin'));
    expect(llamadasDe(falso).filter((l) => l.ruta === '/api/v1/auth/refresh')).toHaveLength(1);
    expect(llamadasDe(falso).filter((l) => l.metodo === 'DELETE')).toHaveLength(1);
  });
});
