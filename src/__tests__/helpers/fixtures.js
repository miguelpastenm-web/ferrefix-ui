// Datos de prueba con la forma REAL del backend. (No es un test.)
import { adaptarProducto } from '../../api/productos.js';

/** ProductoResponseDto. */
export const dtoProducto = (id, extra = {}) => ({
  id,
  sku: `54222232${String(id).padStart(2, '0')}`,
  nombre: `Producto ${id}`,
  marca: 'Marca',
  categoria: 'Herramientas',
  precioVenta: 10000,
  stock: 10,
  estado: 'DISPONIBLE',
  imagenUrl: `/media/productos/p${id}.webp`,
  imagenOfertaUrl: null,
  descripcion: 'Descripción del producto',
  especificaciones: { Potencia: '800 W' },
  createdAt: '2026-01-01T10:00:00',
  updatedAt: '2026-01-01T10:00:00',
  ...extra
});

/** Línea del carrito (ferrefix_carrito_v2) idéntica a lo que guarda agregarAlCarrito para ese producto. */
export const lineaCarrito = (dto, cantidad = 1) => {
  const p = adaptarProducto(dto);
  return { productoId: p.id, sku: p.sku, nombre: p.nombre, marca: p.marca, imagen: p.imagen, precioVenta: p.precioVenta, stock: p.stock, cantidad };
};

export const CLAVE_CARRITO = 'ferrefix_carrito_v2';
export const sembrarCarrito = (lineas) => localStorage.setItem(CLAVE_CARRITO, JSON.stringify(lineas));
export const leerCarritoGuardado = () => JSON.parse(localStorage.getItem(CLAVE_CARRITO) ?? '[]');

/** OrdenResponseDto. */
export const dtoOrden = (extra = {}) => ({
  id: 12,
  codigo: 'ORD-000012',
  boleta: 'BOL-000012',
  estado: 'PAGADA',
  metodoPago: 'WEBPAY_DEBITO',
  items: [{ productoId: 3, sku: '5422223203', nombre: 'Producto 3', precioUnitario: 10000, cantidad: 1, subtotal: 10000 }],
  subtotal: 10000,
  costoEnvio: 3990,
  total: 13990,
  envio: { telefono: '+56 9 8765 4321', direccion: 'Av. Siempre Viva 742', region: 'Región Metropolitana', comuna: 'Santiago', indicaciones: null },
  createdAt: '2026-11-12T10:30:15',
  updatedAt: '2026-11-12T10:30:15',
  ...extra
});
