// Estados y medios de pago de las órdenes, tal como los entrega el backend, con su texto e insignia.

export const ESTADOS_ORDEN = {
  PAGADA: { etiqueta: 'Pagada', clase: 'bg-success-subtle text-success border border-success-subtle' },
  EN_PREPARACION: { etiqueta: 'En preparación', clase: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle' },
  DESPACHADA: { etiqueta: 'Despachada', clase: 'bg-primary-subtle text-primary border border-primary-subtle' },
  ENTREGADA: { etiqueta: 'Entregada', clase: 'bg-success text-white' },
  CANCELADA: { etiqueta: 'Cancelada', clase: 'bg-danger-subtle text-danger border border-danger-subtle' }
};

/** Un estado que el front no conoce (p. ej. uno nuevo del backend) se muestra tal cual, sin romper la pantalla. */
export const infoEstadoOrden = (estado) =>
  ESTADOS_ORDEN[estado] ?? { etiqueta: estado ? String(estado) : 'Sin estado', clase: 'bg-secondary-subtle text-secondary border border-secondary-subtle' };

/** Medios de pago simulados: valor del enum del backend -> texto del checkout. */
export const METODOS_PAGO = [
  { valor: 'WEBPAY_DEBITO', etiqueta: 'WebPay Plus / RedCompra (Débito)' },
  { valor: 'TARJETA_CREDITO', etiqueta: 'Tarjeta de Crédito (3 cuotas sin interés)' },
  { valor: 'TRANSFERENCIA', etiqueta: 'Transferencia Electrónica Directa' }
];

export const etiquetaMetodoPago = (valor) => METODOS_PAGO.find((m) => m.valor === valor)?.etiqueta ?? (valor ? String(valor) : '—');

/**
 * createdAt/updatedAt llegan como texto ISO SIN zona ("2026-11-12T10:30:15", hora de Chile). Se reordenan como TEXTO
 * ("12-11-2026 10:30"); no se pasan por Date, así que no hay conversión de zona horaria. Si no calza, se devuelve tal cual.
 */
export function formatearFechaOrden(texto) {
  if (typeof texto !== 'string') return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(texto.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}:${m[5]}` : texto;
}
