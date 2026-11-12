// Test: Conciliación del carrito con el catálogo: detecta productos que ya no existen, agotados o con cantidad excedida, y actualiza precio y stock sin tocar cantidades
// Función: sincronizarCarrito(), detectarProblemas()

import { describe, test, expect } from 'vitest';
import { sincronizarCarrito, detectarProblemas, PROBLEMA } from '../utils/carritoSync.js';
import { adaptarProducto } from '../api/productos.js';
import { dtoProducto, lineaCarrito } from './helpers/fixtures.js';

const catalogo = (...dtos) => dtos.map(adaptarProducto);

describe('carritoSync', () => {
  test('detectarProblemas: sin catálogo cargado no afirma nada; todo en orden devuelve {}', () => {
    const items = [lineaCarrito(dtoProducto(1), 2)];
    expect(detectarProblemas(items, null)).toEqual({});
    expect(detectarProblemas(items, undefined)).toEqual({});
    expect(detectarProblemas(items, catalogo(dtoProducto(1)))).toEqual({});
    expect(detectarProblemas([], [])).toEqual({});
  });

  test('detectarProblemas: producto ausente = no existe (404); AGOTADO o stock 0 = agotado; cantidad > stock = excede con lo que queda', () => {
    const items = [lineaCarrito(dtoProducto(1), 1), lineaCarrito(dtoProducto(2), 1), lineaCarrito(dtoProducto(3), 1), lineaCarrito(dtoProducto(4), 5)];
    const problemas = detectarProblemas(
      items,
      catalogo(dtoProducto(2, { estado: 'AGOTADO', stock: 0 }), dtoProducto(3, { stock: 0 }), dtoProducto(4, { stock: 3 }))
    );
    expect(problemas).toEqual({
      1: { tipo: PROBLEMA.NO_EXISTE },
      2: { tipo: PROBLEMA.AGOTADO },
      3: { tipo: PROBLEMA.AGOTADO },
      4: { tipo: PROBLEMA.EXCEDE, stockDisponible: 3 }
    });
  });

  test('detectarProblemas: la cantidad igual al stock está bien; cantidad que cabe no es problema', () => {
    const items = [lineaCarrito(dtoProducto(1), 3)];
    expect(detectarProblemas(items, catalogo(dtoProducto(1, { stock: 3 })))).toEqual({});
  });

  test('sincronizarCarrito: actualiza precio, stock, nombre e imagen; NO cambia cantidades; informa los cambios de precio', () => {
    const items = [lineaCarrito(dtoProducto(1, { precioVenta: 30000, stock: 10 }), 4)];
    const r = sincronizarCarrito(items, catalogo(dtoProducto(1, { precioVenta: 35000, stock: 2, nombre: 'Nuevo nombre' })));
    expect(r.huboCambios).toBe(true);
    expect(r.items[0]).toMatchObject({ precioVenta: 35000, stock: 2, nombre: 'Nuevo nombre', cantidad: 4 });
    expect(r.cambiosPrecio).toEqual([{ productoId: 1, nombre: 'Nuevo nombre', anterior: 30000, nuevo: 35000 }]);
  });

  test('sincronizarCarrito: sin diferencias no hay cambios; un producto que ya no existe se deja intacto; entradas raras no lanzan', () => {
    const items = [lineaCarrito(dtoProducto(1), 1), lineaCarrito(dtoProducto(2), 1)];
    const igual = sincronizarCarrito(items, catalogo(dtoProducto(1)));
    expect(igual.huboCambios).toBe(false);
    expect(igual.cambiosPrecio).toEqual([]);
    expect(igual.items[1]).toEqual(items[1]);
    expect(() => sincronizarCarrito(null, null)).not.toThrow();
    expect(sincronizarCarrito(undefined, undefined).items).toEqual([]);
  });
});
