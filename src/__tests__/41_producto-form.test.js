// Test: Formulario de producto: valida con los mismos límites que el backend (SKU, precio, stock, textos, URLs) y arma el cuerpo de la API sin perder especificaciones ni imágenes
// Función: validarProducto(), validarStock(), aRequestDto(), formularioDesdeProducto()

import { describe, test, expect } from 'vitest';
import { validarProducto, validarStock, aRequestDto, formularioDesdeProducto, formularioVacio, CATEGORIAS_FORMULARIO } from '../utils/productoForm.js';
import { adaptarProducto } from '../api/productos.js';
import { dtoProducto } from './helpers/fixtures.js';

const valido = (extra = {}) => ({
  ...formularioVacio(), sku: 'ABC-1', nombre: 'Taladro', marca: 'Bosch', categoria: 'Herramientas', precioVenta: '1000', stock: '5', ...extra
});
const campos = (extra) => Object.keys(validarProducto(valido(extra)));

describe('validarProducto (reglas del backend)', () => {
  test('un formulario correcto no tiene errores y "Todas" no es categoría del formulario', () => {
    expect(validarProducto(valido())).toEqual({});
    expect(formularioVacio().categoria).toBe('Herramientas'); // categoría preseleccionada, como el formulario original
    expect(CATEGORIAS_FORMULARIO).toHaveLength(9);
    expect(CATEGORIAS_FORMULARIO).not.toContain('Todas');
  });

  test('SKU: obligatorio, hasta 30 caracteres y solo letras, números, punto, guion y guion bajo', () => {
    expect(campos({ sku: '' })).toEqual(['sku']);
    expect(campos({ sku: '   ' })).toEqual(['sku']);
    expect(campos({ sku: 'A'.repeat(30) })).toEqual([]);
    expect(validarProducto(valido({ sku: 'A'.repeat(31) })).sku).toBe('El SKU no puede superar 30 caracteres');
    expect(validarProducto(valido({ sku: 'AB C' })).sku).toBe('El SKU solo admite letras, números, punto, guion y guion bajo');
    expect(campos({ sku: 'a.b-c_9' })).toEqual([]);
    expect(campos({ sku: 'ñandú' })).toEqual(['sku']);
  });

  test('nombre (150) y marca (60): obligatorios y con tope', () => {
    expect(validarProducto(valido({ nombre: '' })).nombre).toBe('El nombre es obligatorio');
    expect(campos({ nombre: 'n'.repeat(150) })).toEqual([]);
    expect(validarProducto(valido({ nombre: 'n'.repeat(151) })).nombre).toBe('El nombre no puede superar 150 caracteres');
    expect(validarProducto(valido({ marca: ' ' })).marca).toBe('La marca es obligatoria');
    expect(campos({ marca: 'm'.repeat(60) })).toEqual([]);
    expect(validarProducto(valido({ marca: 'm'.repeat(61) })).marca).toBe('La marca no puede superar 60 caracteres');
  });

  test('categoría: debe ser una de las 9 (sin distinguir mayúsculas)', () => {
    expect(campos({ categoria: 'maderas' })).toEqual([]);
    expect(validarProducto(valido({ categoria: 'Inventada' })).categoria).toMatch(/Categoría inválida\. Valores permitidos: Construcción/);
    expect(validarProducto(valido({ categoria: 'Todas' })).categoria).toMatch(/Categoría inválida/);
    expect(validarProducto(valido({ categoria: '' })).categoria).toBe('La categoría es obligatoria');
  });

  test('precio: entero de 1 a 999.999.999', () => {
    expect(validarProducto(valido({ precioVenta: '' })).precioVenta).toBe('El precio es obligatorio');
    expect(validarProducto(valido({ precioVenta: '0' })).precioVenta).toBe('El precio debe ser mayor a 0');
    expect(validarProducto(valido({ precioVenta: '-5' })).precioVenta).toBe('El precio debe ser mayor a 0');
    expect(validarProducto(valido({ precioVenta: '10.5' })).precioVenta).toBe('El precio debe ser un número entero');
    expect(validarProducto(valido({ precioVenta: 'abc' })).precioVenta).toBe('El precio debe ser un número entero');
    expect(campos({ precioVenta: '1' })).toEqual([]);
    expect(campos({ precioVenta: '999999999' })).toEqual([]);
    expect(validarProducto(valido({ precioVenta: '1000000000' })).precioVenta).toBe('El precio supera el máximo permitido');
  });

  test('stock: entero de 0 a 1.000.000 (el 0 es válido: queda AGOTADO)', () => {
    expect(validarStock('')).toBe('El stock es obligatorio');
    expect(validarStock('-1')).toBe('El stock no puede ser negativo');
    expect(validarStock('0')).toBe('');
    expect(validarStock('1000000')).toBe('');
    expect(validarStock('1000001')).toBe('El stock supera el máximo permitido');
    expect(validarStock('2.5')).toBe('El stock debe ser un número entero');
    expect(validarProducto(valido({ stock: '' })).stock).toBe('El stock es obligatorio');
  });

  test('descripción (2000) y URLs de imagen (300, relativas o http/https)', () => {
    expect(campos({ descripcion: 'd'.repeat(2000) })).toEqual([]);
    expect(validarProducto(valido({ descripcion: 'd'.repeat(2001) })).descripcion).toBe('La descripción no puede superar 2000 caracteres');
    expect(campos({ imagenUrl: '/media/productos/a.png' })).toEqual([]);
    expect(campos({ imagenUrl: 'https://cdn.x.cl/a.png' })).toEqual([]);
    expect(campos({ imagenUrl: '' })).toEqual([]);
    expect(validarProducto(valido({ imagenUrl: 'foto.png' })).imagenUrl).toBe('La URL de la imagen debe ser relativa (/media/...) o http(s)');
    expect(validarProducto(valido({ imagenOfertaUrl: 'ftp://x' })).imagenOfertaUrl).toMatch(/imagen de oferta/);
    expect(validarProducto(valido({ imagenUrl: '/' + 'a'.repeat(300) })).imagenUrl).toBe('La URL de la imagen no puede superar 300 caracteres');
  });

  test('un formulario vacío marca todos los obligatorios a la vez', () => {
    expect(Object.keys(validarProducto({ ...formularioVacio(), categoria: '' })).sort()).toEqual(['categoria', 'marca', 'nombre', 'precioVenta', 'sku', 'stock']);
  });
});

describe('aRequestDto y formularioDesdeProducto', () => {
  test('aRequestDto: recorta textos, convierte números y deja vacíos como null; las especificaciones viajan completas', () => {
    const dto = aRequestDto(valido({ sku: ' X1 ', nombre: ' N ', descripcion: '  ', especificaciones: { Potencia: '800 W' } }));
    expect(dto).toEqual({
      sku: 'X1', nombre: 'N', marca: 'Bosch', categoria: 'Herramientas', precioVenta: 1000, stock: 5,
      descripcion: null, imagenUrl: null, imagenOfertaUrl: null, especificaciones: { Potencia: '800 W' }
    });
    expect(typeof dto.precioVenta).toBe('number');
    expect(typeof dto.stock).toBe('number');
  });

  test('formularioDesdeProducto carga las rutas RELATIVAS del backend (no las URLs completas) y copia las especificaciones', () => {
    const p = adaptarProducto(dtoProducto(7, { imagenOfertaUrl: '/media/ofertas/o.webp', especificaciones: { A: '1', B: '2' } }));
    const f = formularioDesdeProducto(p);
    expect(f.imagenUrl).toBe('/media/productos/p7.webp');
    expect(f.imagenOfertaUrl).toBe('/media/ofertas/o.webp');
    expect(f.precioVenta).toBe('10000');
    expect(f.especificaciones).toEqual({ A: '1', B: '2' });
    expect(f.especificaciones).not.toBe(p.especificaciones); // copia
    expect(aRequestDto(f).imagenUrl).toBe('/media/productos/p7.webp');
  });
});
