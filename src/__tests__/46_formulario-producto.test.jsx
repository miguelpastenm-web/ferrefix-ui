// Test: Formulario de producto (alta y edición): valida antes de enviar, sube las imágenes por multipart, bloquea el SKU al editar, no pierde especificaciones ni stock vigente, y maneja 400, 409, 404 y red caída sin reintentar solo
// Función: FormularioProducto()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import FormularioProducto from '../components/FormularioProducto.jsx';
import { adaptarProducto } from '../api/productos.js';
import { guardarSesion, borrarSesion } from '../api/sesionAlmacen.js';
import { MENSAJE_OPERACION_SIN_CONFIRMAR } from '../utils/errorAdmin.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend, diferido } from './helpers/fetchMock.js';
import { dtoProducto } from './helpers/fixtures.js';
import { archivoImagen } from './helpers/archivos.js';

const DTO_ORIGINAL = dtoProducto(7, {
  sku: 'TAL-001', nombre: 'Taladro', marca: 'Bosch', categoria: 'Herramientas', precioVenta: 90000, stock: 10,
  imagenUrl: '/media/productos/p7.webp', imagenOfertaUrl: '/media/ofertas/o7.webp', especificaciones: { Potencia: '800 W' }
});
const ORIGINAL = adaptarProducto(DTO_ORIGINAL);

let servidor;
let falso;
const montar = (producto = null) => {
  const props = { producto, onGuardado: vi.fn(), onCancelar: vi.fn(), onRefrescar: vi.fn() };
  const vista = render(<FormularioProducto {...props} />);
  return { ...props, ...vista };
};
const escribir = (etiqueta, valor) => fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
const llenarAlta = () => {
  escribir(/SKU/, ' NUE-001 ');
  escribir(/Nombre del Producto/, 'Esmeril');
  escribir(/Marca/, 'Makita');
  escribir(/Precio Unitario/, '45000');
  escribir(/Stock Disponible/, '12');
};
const enviar = (nombre) => fireEvent.click(screen.getByRole('button', { name: nombre }));
const posts = (ruta) => llamadasDe(falso).filter((l) => l.metodo === 'POST' && l.ruta === ruta);

describe('FormularioProducto', () => {
  beforeEach(() => {
    localStorage.clear();
    borrarSesion();
    guardarSesion({ accessToken: 'tok', refreshToken: 'r' });
    URL.createObjectURL = vi.fn(() => 'blob:vista-previa');
    URL.revokeObjectURL = vi.fn();
    servidor = {
      fresco: DTO_ORIGINAL,
      post: () => respuestaJson(201, dtoProducto(30, { sku: 'NUE-001', nombre: 'Esmeril' })),
      put: (l) => respuestaJson(200, { ...DTO_ORIGINAL, nombre: l.cuerpo.nombre }),
      imagen: (l) => respuestaJson(201, { url: `/media/${l.init.body.get('destino')}/${l.init.body.get('destino')}-nueva.png`, destino: l.init.body.get('destino'), tipo: 'image/png', tamano: 100 })
    };
    falso = instalarFetch((l) => {
      if (l.ruta === '/api/v1/imagenes') return servidor.imagen(l);
      if (l.metodo === 'POST' && l.ruta === '/api/v1/productos') return servidor.post(l);
      if (l.metodo === 'GET' && l.ruta === '/api/v1/productos/7') return servidor.fresco instanceof Response ? servidor.fresco : respuestaJson(200, servidor.fresco);
      if (l.metodo === 'PUT' && l.ruta === '/api/v1/productos/7') return servidor.put(l);
      return errorBackend(404, 'no existe');
    });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  describe('alta', () => {
    test('campos con etiqueta asociada; con los obligatorios vacíos muestra los errores junto a cada campo y NO llama a la API', () => {
      montar();
      expect(screen.getByRole('heading', { name: 'Agregar Nuevo Producto' })).toBeTruthy();
      enviar('Registrar Producto');
      const mensajes = [...document.querySelectorAll('.invalid-feedback')].map((n) => n.textContent);
      expect(mensajes).toEqual(expect.arrayContaining(['El SKU es obligatorio', 'El nombre es obligatorio', 'La marca es obligatoria', 'El precio es obligatorio', 'El stock es obligatorio']));
      expect(falso).not.toHaveBeenCalled();
    });

    test('alta correcta: POST /productos con los datos recortados y numéricos, y avisa con el producto creado', async () => {
      const { onGuardado } = montar();
      llenarAlta();
      enviar('Registrar Producto');
      await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
      const [producto, modo] = onGuardado.mock.calls[0];
      expect(modo).toBe('crear');
      expect(producto.id).toBe(30);
      const [post] = posts('/api/v1/productos');
      expect(post.cuerpo).toMatchObject({ sku: 'NUE-001', nombre: 'Esmeril', marca: 'Makita', categoria: 'Herramientas', precioVenta: 45000, stock: 12, imagenUrl: null, imagenOfertaUrl: null });
    });

    test('con imágenes: sube primero la principal (destino productos) y la de oferta (destino ofertas) y crea con ambas rutas', async () => {
      const { onGuardado, container } = montar();
      llenarAlta();
      const [entradaPrincipal, entradaOferta] = container.querySelectorAll('input[type="file"]');
      fireEvent.change(entradaPrincipal, { target: { files: [archivoImagen('foto.png')] } });
      fireEvent.change(entradaOferta, { target: { files: [archivoImagen('oferta.webp', 'image/webp')] } });
      enviar('Registrar Producto');
      await waitFor(() => expect(onGuardado).toHaveBeenCalled());
      const llamadas = llamadasDe(falso);
      expect(llamadas.map((l) => l.ruta)).toEqual(['/api/v1/imagenes', '/api/v1/imagenes', '/api/v1/productos']);
      expect(llamadas[0].init.body.get('destino')).toBe('productos');
      expect(llamadas[1].init.body.get('destino')).toBe('ofertas');
      expect(llamadas[2].cuerpo.imagenUrl).toBe('/media/productos/productos-nueva.png');
      expect(llamadas[2].cuerpo.imagenOfertaUrl).toBe('/media/ofertas/ofertas-nueva.png');
    });

    test('una imagen con formato no permitido se rechaza al elegirla (con aviso) y no se sube nada', async () => {
      const { container } = montar();
      llenarAlta();
      fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [archivoImagen('animacion.gif', 'image/gif')] } });
      expect(screen.getByText(/Formato no permitido/)).toBeTruthy();
      enviar('Registrar Producto');
      await waitFor(() => expect(posts('/api/v1/productos')).toHaveLength(1));
      expect(posts('/api/v1/imagenes')).toHaveLength(0);
      expect(posts('/api/v1/productos')[0].cuerpo.imagenUrl).toBeNull();
    });

    test('409 por SKU repetido: el mensaje queda junto al campo SKU, no se cierra y se puede corregir', async () => {
      servidor.post = () => errorBackend(409, 'Ya existe un producto con el SKU NUE-001');
      const { onGuardado } = montar();
      llenarAlta();
      enviar('Registrar Producto');
      expect(await screen.findByText('Ya existe un producto con el SKU NUE-001', { selector: '.invalid-feedback' })).toBeTruthy();
      expect(screen.getByRole('alert').textContent).toBe('Ya existe un producto con el SKU NUE-001');
      expect(onGuardado).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Registrar Producto' }).disabled).toBe(false);
    });

    test('400 con detalles del backend: cada mensaje aparece junto a su campo', async () => {
      servidor.post = () => errorBackend(400, 'Datos de entrada inválidos', ['precioVenta: El precio debe ser mayor a 0', 'marca: La marca es obligatoria']);
      montar();
      llenarAlta();
      enviar('Registrar Producto');
      expect(await screen.findByText('El precio debe ser mayor a 0', { selector: '.invalid-feedback' })).toBeTruthy();
      expect(screen.getByText('La marca es obligatoria', { selector: '.invalid-feedback' })).toBeTruthy();
    });

    test('red caída al crear: avisa que no se pudo confirmar, refresca la lista y NO reintenta sola', async () => {
      servidor.post = () => new TypeError('Failed to fetch');
      const { onGuardado, onRefrescar } = montar();
      llenarAlta();
      enviar('Registrar Producto');
      expect((await screen.findByRole('alert')).textContent).toBe(MENSAJE_OPERACION_SIN_CONFIRMAR);
      expect(onRefrescar).toHaveBeenCalledTimes(1);
      expect(onGuardado).not.toHaveBeenCalled();
      await new Promise((r) => setTimeout(r, 40));
      expect(posts('/api/v1/productos')).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Registrar Producto' }).disabled).toBe(false);
    });

    test('doble clic en Registrar: se envía una sola vez', async () => {
      const pendiente = diferido();
      servidor.post = () => pendiente.promesa.then(() => respuestaJson(201, dtoProducto(31)));
      const { onGuardado } = montar();
      llenarAlta();
      const boton = screen.getByRole('button', { name: 'Registrar Producto' });
      fireEvent.click(boton);
      fireEvent.click(boton);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Guardando…' }).disabled).toBe(true));
      pendiente.resolver();
      await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
      expect(posts('/api/v1/productos')).toHaveLength(1);
    });
  });

  describe('edición', () => {
    test('carga los datos del producto, bloquea el SKU y muestra las imágenes actuales', () => {
      montar(ORIGINAL);
      expect(screen.getByRole('heading', { name: 'Editar Producto' })).toBeTruthy();
      const sku = screen.getByLabelText(/SKU/);
      expect(sku.value).toBe('TAL-001');
      expect(sku.disabled).toBe(true);
      expect(screen.getByText('El SKU no se puede modificar.')).toBeTruthy();
      expect(screen.getByLabelText(/Nombre del Producto/).value).toBe('Taladro');
      expect(screen.getByLabelText(/Precio Unitario/).value).toBe('90000');
      expect(screen.getAllByAltText('Vista previa del producto')).toHaveLength(2);
    });

    test('relee el producto antes del PUT y reenvía sus especificaciones, imagen de oferta y SKU; no cambia lo que no se tocó', async () => {
      // Mientras el formulario estaba abierto otra persona agregó una especificación y hubo ventas (stock 7)
      servidor.fresco = { ...DTO_ORIGINAL, stock: 7, especificaciones: { Potencia: '800 W', Peso: '1,8 kg' } };
      const { onGuardado } = montar(ORIGINAL);
      escribir(/Nombre del Producto/, 'Taladro Percutor 20V');
      enviar('Guardar Cambios');
      await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
      expect(onGuardado.mock.calls[0][1]).toBe('editar');
      const llamadas = llamadasDe(falso);
      expect(llamadas.map((l) => `${l.metodo} ${l.ruta}`)).toEqual(['GET /api/v1/productos/7', 'PUT /api/v1/productos/7']);
      expect(llamadas[1].cuerpo).toEqual({
        sku: 'TAL-001', nombre: 'Taladro Percutor 20V', marca: 'Bosch', categoria: 'Herramientas', precioVenta: 90000,
        stock: 7, // el vigente, no el 10 con que se abrió la pantalla
        descripcion: 'Descripción del producto', imagenUrl: '/media/productos/p7.webp', imagenOfertaUrl: '/media/ofertas/o7.webp',
        especificaciones: { Potencia: '800 W', Peso: '1,8 kg' }
      });
    });

    test('si el administrador SÍ cambió el stock, se envía el nuevo valor', async () => {
      servidor.fresco = { ...DTO_ORIGINAL, stock: 7 };
      const { onGuardado } = montar(ORIGINAL);
      escribir(/Stock Disponible/, '25');
      enviar('Guardar Cambios');
      await waitFor(() => expect(onGuardado).toHaveBeenCalled());
      expect(llamadasDe(falso)[1].cuerpo.stock).toBe(25);
    });

    test('"Usar imagen por defecto" y "Quitar imagen de oferta" envían null en esas rutas; una imagen nueva reemplaza solo a la suya', async () => {
      const { onGuardado, container } = montar(ORIGINAL);
      fireEvent.click(screen.getByRole('button', { name: 'Usar imagen por defecto' }));
      fireEvent.click(screen.getByRole('button', { name: 'Quitar imagen de oferta' }));
      enviar('Guardar Cambios');
      await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
      expect(llamadasDe(falso)[1].cuerpo).toMatchObject({ imagenUrl: null, imagenOfertaUrl: null });
      cleanup();

      falso = instalarFetch((l) => (l.ruta === '/api/v1/imagenes' ? servidor.imagen(l) : l.metodo === 'GET' ? respuestaJson(200, DTO_ORIGINAL) : servidor.put(l)));
      const otra = montar(ORIGINAL);
      fireEvent.change(otra.container.querySelectorAll('input[type="file"]')[0], { target: { files: [archivoImagen('nueva.png')] } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
      await waitFor(() => expect(otra.onGuardado).toHaveBeenCalled());
      const put = llamadasDe(falso).find((l) => l.metodo === 'PUT');
      expect(put.cuerpo.imagenUrl).toBe('/media/productos/productos-nueva.png');
      expect(put.cuerpo.imagenOfertaUrl).toBe('/media/ofertas/o7.webp');
      expect(container).toBeTruthy();
    });

    test('si el producto ya no existe (404 al releerlo): avisa, refresca la lista y no hace el PUT', async () => {
      servidor.fresco = errorBackend(404, 'Producto no encontrado: 7');
      const { onGuardado, onRefrescar } = montar(ORIGINAL);
      enviar('Guardar Cambios');
      expect((await screen.findByRole('alert')).textContent).toBe('Producto no encontrado: 7');
      expect(onRefrescar).toHaveBeenCalledTimes(1);
      expect(onGuardado).not.toHaveBeenCalled();
      expect(llamadasDe(falso).some((l) => l.metodo === 'PUT')).toBe(false);
    });

    test('409 al editar (SKU de otro producto) y red caída en el PUT se tratan como en el alta', async () => {
      servidor.put = () => errorBackend(409, 'Ya existe otro producto con el SKU TAL-001');
      const { onGuardado } = montar(ORIGINAL);
      enviar('Guardar Cambios');
      expect(await screen.findByText('Ya existe otro producto con el SKU TAL-001', { selector: '.invalid-feedback' })).toBeTruthy();
      cleanup();

      servidor.put = () => new TypeError('Failed to fetch');
      const otra = montar(ORIGINAL);
      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
      expect((await screen.findByRole('alert')).textContent).toBe(MENSAJE_OPERACION_SIN_CONFIRMAR);
      expect(otra.onRefrescar).toHaveBeenCalledTimes(1);
      expect(onGuardado).not.toHaveBeenCalled();
      await new Promise((r) => setTimeout(r, 30));
      expect(llamadasDe(falso).filter((l) => l.metodo === 'PUT')).toHaveLength(2); // uno por cada intento del usuario, ninguno solo
    });
  });

  test('Cancelar y la X cierran sin llamar a la API', () => {
    const { onCancelar } = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onCancelar).toHaveBeenCalledTimes(2);
    expect(falso).not.toHaveBeenCalled();
  });
});
