// Test: Rechazos de POST /ordenes: interpreta el formato real de los mensajes del backend (409 de stock con "(SKU …)", 409 de bloqueo y 404 con ids) para marcar las líneas del carrito
// Función: skuDeDetalle(), idsNoEncontrados(), marcasDeError(), esConflictoDeBloqueo()

import { describe, test, expect } from 'vitest';
import {
  skuDeDetalle, idDeProductoInexistente, idsNoEncontrados, marcasDeError, esConflictoDeBloqueo, esConflictoDeStock, MENSAJE_COMPRA_SIN_CONFIRMAR
} from '../utils/errorOrden.js';
import { ApiError } from '../api/errores.js';

// Formatos exactos que arma OrdenServiceImpl.stockInsuficiente()
const AGOTADO = 'Esmeril Angular 4-1/2" 850W (SKU 5422223216): agotado';
const PARCIAL = 'Sierra Circular (7-1/4") (SKU 5422223215): disponibles 3, solicitaste 5';
const INEXISTENTE = 'Producto 7: ya no existe';
const MSG_STOCK = 'No hay stock suficiente para completar la compra. No se descontó nada';
const MSG_BLOQUEO = 'El recurso está siendo modificado por otra operación. Intente nuevamente';

const ITEMS = [
  { productoId: 3, sku: '5422223216', nombre: 'Esmeril' },
  { productoId: 4, sku: '5422223215', nombre: 'Sierra' },
  { productoId: 7, sku: '5422223207', nombre: 'Otro' },
  { productoId: 9, sku: '5422223209', nombre: 'Intacto' }
];

describe('Interpretación de rechazos de la orden', () => {
  test('skuDeDetalle: saca el SKU aunque el nombre tenga comillas o paréntesis; sin SKU devuelve null', () => {
    expect(skuDeDetalle(AGOTADO)).toBe('5422223216');
    expect(skuDeDetalle(PARCIAL)).toBe('5422223215');
    expect(skuDeDetalle(INEXISTENTE)).toBeNull();
    expect(skuDeDetalle(undefined)).toBeNull();
  });

  test('idDeProductoInexistente e idsNoEncontrados', () => {
    expect(idDeProductoInexistente(INEXISTENTE)).toBe(7);
    expect(idDeProductoInexistente(AGOTADO)).toBeNull();
    expect(idsNoEncontrados('Producto no encontrado: [3, 9]')).toEqual([3, 9]);
    expect(idsNoEncontrados('Producto no encontrado: 12')).toEqual([12]);
    expect(idsNoEncontrados('otra cosa')).toEqual([]);
  });

  test('409 de stock: marca solo las líneas de los detalles (por SKU o por id) y deja intactas las demás', () => {
    const error = new ApiError({ status: 409, mensaje: MSG_STOCK, detalles: [AGOTADO, PARCIAL, INEXISTENTE, 'detalle raro sin SKU'] });
    expect(esConflictoDeStock(error)).toBe(true);
    expect(esConflictoDeBloqueo(error)).toBe(false);
    expect(marcasDeError(error, ITEMS)).toEqual({ 3: AGOTADO, 4: PARCIAL, 7: INEXISTENTE });
  });

  test('409 de bloqueo se distingue del de stock y no marca líneas', () => {
    const error = new ApiError({ status: 409, mensaje: MSG_BLOQUEO });
    expect(esConflictoDeBloqueo(error)).toBe(true);
    expect(esConflictoDeStock(error)).toBe(false);
    expect(marcasDeError(error, ITEMS)).toEqual({});
  });

  test('404: marca las líneas cuyos ids vienen en "Producto no encontrado: [..]"', () => {
    const error = new ApiError({ status: 404, mensaje: 'Producto no encontrado: [3, 99]' });
    expect(marcasDeError(error, ITEMS)).toEqual({ 3: 'Este producto ya no existe en el catálogo.' });
  });

  test('Otros errores no marcan nada; el texto de "no se pudo confirmar" es exactamente el pedido', () => {
    expect(marcasDeError(new ApiError({ status: 400, mensaje: 'x' }), ITEMS)).toEqual({});
    expect(marcasDeError(null, ITEMS)).toEqual({});
    expect(esConflictoDeBloqueo(null)).toBe(false);
    expect(MENSAJE_COMPRA_SIN_CONFIRMAR).toBe('No pudimos confirmar tu compra; revisa Mis compras antes de volver a intentar');
  });
});
