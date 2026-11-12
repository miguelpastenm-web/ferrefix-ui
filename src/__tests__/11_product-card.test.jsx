// Test: ProductCard: renderiza nombre, marca, precio y enlace de detalle, no falla con producto null y usa la imagen de respaldo cuando falta la imagen y muestra la insignia Agotado
// Función: ProductCard()

import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';

const productoMock = {
  id: 14,
  nombre: 'Taladro Percutor Inalámbrico 20V',
  marca: 'DeWalt',
  precioVenta: 129990,
  imagen: '/taladro.webp'
};

const renderizar = (producto) =>
  render(
    <MemoryRouter>
      <ProductCard producto={producto} />
    </MemoryRouter>
  );

describe('Componente ProductCard', () => {
  afterEach(() => {
    cleanup();
  });

  test('ProductCard: renderiza nombre, marca, precio y enlace de detalle, no falla con producto null y usa la imagen de respaldo cuando falta la imagen y muestra la insignia Agotado', () => {
    renderizar(productoMock);
    expect(screen.getByText('Taladro Percutor Inalámbrico 20V')).toBeTruthy();
    expect(screen.getByText('DeWalt')).toBeTruthy();
    expect(screen.getByText(/\$129\.990/)).toBeTruthy();
    const enlace = screen.getByRole('link');
    expect(enlace.getAttribute('href')).toBe('/producto/14');
    expect(screen.getByRole('img').getAttribute('alt')).toBe(
      'Taladro Percutor Inalámbrico 20V'
    );

    const sinProducto = renderizar(null);
    expect(sinProducto.container.firstChild).toBeNull();
    cleanup();

    renderizar({ id: 999, nombre: 'Producto Básico', precioVenta: 0 });
    const imagenRespaldo = screen.getByRole('img').getAttribute('src');
    expect(imagenRespaldo).toBe('/banner-web.webp');
    expect(screen.getByText(/\$0/)).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/producto/999');
    expect(screen.queryByText('Agotado')).toBeNull();
    cleanup();

    // Un producto AGOTADO se muestra con su insignia (y por stock en 0 también)
    renderizar({ id: 5, nombre: 'Esmeril', precioVenta: 1000, estado: 'AGOTADO', stock: 0 });
    expect(screen.getByText('Agotado')).toBeTruthy();
    cleanup();
    renderizar({ id: 6, nombre: 'Sierra', precioVenta: 1000, estado: 'DISPONIBLE', stock: 0 });
    expect(screen.getByText('Agotado')).toBeTruthy();
  });
});
