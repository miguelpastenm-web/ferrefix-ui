// Test: Catálogo desde la API: muestra los productos del backend con sus imágenes, filtra la categoría en el servidor (nunca "Todas"), busca sin tildes y ordena por precio en el cliente, y maneja error y agotados
// Función: Catalogo()

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Catalogo from '../pages/Catalogo.jsx';
import { API_URL } from '../api/config.js';
import { instalarFetch, llamadasDe, respuestaJson, errorBackend } from './helpers/fetchMock.js';
import { dtoProducto } from './helpers/fixtures.js';

const LISTA = [
  dtoProducto(1, { nombre: 'Taladro Percutor', categoria: 'Herramientas', precioVenta: 90000, createdAt: '2026-01-01T10:00:00' }),
  dtoProducto(2, { nombre: 'Cemento Extra', categoria: 'Construcción', precioVenta: 5000, createdAt: '2026-03-01T10:00:00' }),
  dtoProducto(3, { nombre: 'Llave de Gasfitería', categoria: 'Gasfitería', precioVenta: 20000, createdAt: '2026-02-01T10:00:00' }),
  dtoProducto(4, { nombre: 'Esmeril Angular', categoria: 'Herramientas', precioVenta: 60000, stock: 0, estado: 'AGOTADO' })
];

// Servidor falso: respeta ?categoria= como el backend
const servidor = (l) => {
  const categoria = new URL(l.url).searchParams.get('categoria');
  return respuestaJson(200, categoria ? LISTA.filter((p) => p.categoria === categoria) : LISTA);
};

const montar = (ruta = '/catalogo') =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Catalogo />
    </MemoryRouter>
  );
const titulos = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

describe('Catálogo conectado a la API', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('Muestra "cargando", luego los productos del backend con imágenes desde la API y su enlace por id numérico', async () => {
    instalarFetch(servidor);
    montar();
    expect(screen.getByText('Cargando productos…')).toBeTruthy();
    expect(await screen.findByText('Taladro Percutor')).toBeTruthy();
    expect(screen.queryByText('Cargando productos…')).toBeNull();
    const imagen = screen.getByAltText('Taladro Percutor');
    expect(imagen.getAttribute('src')).toBe(`${API_URL}/media/productos/p1.webp`);
    expect(screen.getByText('Taladro Percutor').closest('a').getAttribute('href')).toBe('/producto/1');
    expect(screen.getByText(/\$90\.000/)).toBeTruthy(); // precioVenta como precio final
  });

  test('Sin categoría NO envía el parámetro; con ?categoria=Herramientas lo envía; la opción "Todas" nunca viaja', async () => {
    const falso = instalarFetch(servidor);
    montar('/catalogo');
    await screen.findByText('Taladro Percutor');
    expect(llamadasDe(falso)[0].ruta).toBe('/api/v1/productos');

    fireEvent.click(screen.getByRole('button', { name: 'Herramientas' }));
    await waitFor(() => expect(llamadasDe(falso).at(-1).ruta).toBe('/api/v1/productos?categoria=Herramientas'));
    await waitFor(() => expect(titulos()).toEqual(['Taladro Percutor', 'Esmeril Angular']));

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    await waitFor(() => expect(titulos()).toHaveLength(4));
    expect(llamadasDe(falso).every((l) => !/categoria=Todas/i.test(l.ruta))).toBe(true);
    expect(llamadasDe(falso).at(-1).ruta).toBe('/api/v1/productos');
  });

  test('La categoría de la URL se normaliza (mayúsculas) y una categoría desconocida no se consulta: catálogo vacío', async () => {
    const falso = instalarFetch(servidor);
    montar('/catalogo?categoria=herramientas');
    await screen.findByText('Taladro Percutor');
    expect(llamadasDe(falso)[0].ruta).toBe('/api/v1/productos?categoria=Herramientas');
    cleanup();

    const otro = instalarFetch(servidor);
    montar('/catalogo?categoria=Inventada');
    expect(await screen.findByText('No se encontraron productos')).toBeTruthy();
    expect(otro).not.toHaveBeenCalled();
  });

  test('La búsqueda ignora tildes y mayúsculas y se hace en el cliente (sin nueva petición)', async () => {
    const falso = instalarFetch(servidor);
    montar();
    await screen.findByText('Taladro Percutor');
    fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre o marca/), { target: { value: 'GASFITERIA' } });
    expect(titulos()).toEqual(['Llave de Gasfitería']);
    expect(falso).toHaveBeenCalledTimes(1);
  });

  test('Ordenar por precio y por llegada se hace en el cliente', async () => {
    instalarFetch(servidor);
    montar();
    await screen.findByText('Taladro Percutor');
    fireEvent.change(screen.getByLabelText(/Ordenar/), { target: { value: 'precio-asc' } });
    expect(titulos()).toEqual(['Cemento Extra', 'Llave de Gasfitería', 'Esmeril Angular', 'Taladro Percutor']);
    fireEvent.change(screen.getByLabelText(/Ordenar/), { target: { value: 'precio-desc' } });
    expect(titulos()[0]).toBe('Taladro Percutor');
    fireEvent.change(screen.getByLabelText(/Ordenar/), { target: { value: 'ultimas-llegadas' } });
    expect(titulos()[0]).toBe('Cemento Extra'); // createdAt más reciente
  });

  test('Los productos AGOTADO se muestran con su insignia', async () => {
    instalarFetch(servidor);
    montar();
    await screen.findByText('Esmeril Angular');
    expect(screen.getAllByText('Agotado')).toHaveLength(1);
  });

  test('Si la API falla muestra el error con Reintentar y al reintentar carga los productos', async () => {
    let falla = true;
    const falso = instalarFetch((l) => (falla ? errorBackend(500, 'Error interno del servidor') : servidor(l)));
    montar();
    expect(await screen.findByText('No pudimos cargar el catálogo')).toBeTruthy();
    expect(screen.getByText('Error interno del servidor')).toBeTruthy();
    expect(screen.queryByText('No se encontraron productos')).toBeNull();
    falla = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Taladro Percutor')).toBeTruthy();
    expect(falso).toHaveBeenCalledTimes(2);
  });
});
