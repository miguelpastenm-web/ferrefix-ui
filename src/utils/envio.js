// ESTIMACIÓN del costo de envío que se muestra en el carrito ANTES de comprar.
// El costo real y el total los calcula el servidor al crear la orden (gratis si el subtotal SUPERA el umbral, que es
// una propiedad del backend). La boleta siempre muestra lo que devuelve el servidor, nunca esta estimación.

export const UMBRAL_ENVIO_GRATIS_ESTIMADO = 50000;
export const COSTO_ENVIO_ESTIMADO = 3990;

export const TEXTO_ENVIO_GRATIS = 'Despacho gratis en compras superiores a $50.000.';
export const NOTA_ESTIMACION = 'Valores estimados: el costo de envío y el total definitivos los calcula el servidor al confirmar tu compra.';

export const estimarEnvio = (subtotal) => {
  const monto = Number(subtotal) || 0;
  if (monto <= 0) return 0;
  return monto > UMBRAL_ENVIO_GRATIS_ESTIMADO ? 0 : COSTO_ENVIO_ESTIMADO;
};
